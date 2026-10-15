import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { initCentralDatabase } from "./server/db";
import { apiRouter } from "./server/routes";

dotenv.config();

const rootDir = process.cwd();

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize Persistent Central Database
  await initCentralDatabase();

  app.use(express.json({ limit: "10mb" }));

  // Enable CORS for API routes so Preview, Web, and remote clients can communicate cleanly
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-device-id, x-business-id, x-session-token");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Mount Central EBS REST API Routes FIRST
  app.use("/api", apiRouter);

  // API Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", app: "EBS - Enterprise Business System", version: "1.3.0" });
  });

  // AI Assistant endpoint with Role-Based Access Control (RBAC) and Persona Support
  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    try {
      const message = req.body.message || req.body.prompt;
      const businessContext = req.body.businessContext || req.body.businessData || {};
      const userRole = (req.body.userRole || req.body.role || "cashier").toLowerCase();
      const userName = req.body.userName || "Mtumiaji";
      const requestedPersona = (req.body.persona || req.body.aiPersona || "Orbit").toString().trim();

      if (!message || typeof message !== "string" || !message.trim()) {
        res.status(400).json({ error: "Message or prompt is required" });
        return;
      }

      const isExecutive = ["owner", "boss", "admin", "manager"].includes(userRole);

      // AI Persona Style and Tone Directives
      const personaStyles: Record<string, { name: string; tone: string; instruction: string }> = {
        orbit: {
          name: "Orbit",
          tone: "Rasmi, Yenye Mamlaka & Maamuzi Thabiti",
          instruction: "Wewe una haiba ya ORBIT (Kiongozi Mkuu). Zungumza kwa heshima ya kiuongozi, sauti imara, iliyonyooka na yenye mamlaka ya kibiashara. Zingatia maamuzi thabiti ya kimkakati, takwimu sahihi za fedha na ukuaji wa faida.",
        },
        capella: {
          name: "Capella",
          tone: "Changamfu, Yenye Nishati & Maneno ya Kutia Moyo",
          instruction: "Wewe una haiba ya CAPELLA (Mhamasishaji Changamfu). Zungumza kwa uchangamfu mkubwa, nishati chanya, maneno ya kutia moyo, na msisitizo wa kuongeza morali ya mauzo na furaha kwa wateja.",
        },
        vega: {
          name: "Vega",
          tone: "Tulivu, Laini & Maelezo ya Subira",
          instruction: "Wewe una haiba ya VEGA (Mshauri Tulivu). Zungumza kwa utulivu wa hali ya juu, upole, staha na maelezo ya kina ya hatua kwa hatua kwa subira, ukisaidia kutatua changamoto bila haraka.",
        },
        ursa: {
          name: "Ursa",
          tone: "Nzito, Makini & Udhibiti Mkali wa Hasara",
          instruction: "Wewe una haiba ya URSA (Msimamizi Makini wa Fedha). Zungumza kwa sauti nzito, umakini mkubwa kwenye takwimu za fedha, kudhibiti matumizi, kuzuia upotevu wa stoo, na kutoruhusu uzembe.",
        },
        pegasus: {
          name: "Pegasus",
          tone: "Fasaha, Yenye Kasi & Majibu Mafupi ya Moja kwa Moja",
          instruction: "Wewe una haiba ya PEGASUS (Mchambuzi wa Haraka). Zungumza kwa ufasaha wa hali ya juu, wepesi na kasi, ukitoa majibu mafupi, yaliyonyooka moja kwa moja kwenye shabaha ya kuuza zaidi kwa haraka.",
        },
        flare: {
          name: "Flare",
          tone: "Kisasa, Angavu & Mawazo Mapya ya Masoko",
          instruction: "Wewe una haiba ya FLARE (Msaidizi wa Kisasa & Mbunifu). Zungumza kwa mtindo wa kisasa na ubunifu, ukitumia mawazo mapya ya kidijitali, ofa za kisasa, na mbinu bunifu za kuvutia wateja.",
        },
      };

      const matchedPersona = personaStyles[requestedPersona.toLowerCase()] || personaStyles.orbit;

      // Filter context for non-executive roles so confidential figures are never exposed
      const safeContext = isExecutive
        ? businessContext
        : {
            businessName: businessContext?.businessName,
            currency: businessContext?.currency,
            totalProducts: businessContext?.totalProducts,
            lowStockProducts: businessContext?.lowStockProducts,
            // Operational data only - no overall profits or executive withdrawals
            currentUserRole: userRole,
            currentUserName: userName,
          };

      const ai = getAiClient();
      if (!ai) {
        const reply = generateLocalAiResponse(message, safeContext, userRole);
        res.json({ reply, source: "local-engine", persona: matchedPersona.name });
        return;
      }

      let systemInstruction = "";
      if (isExecutive) {
        systemInstruction = `Wewe ni "EBS AI" — Kiongozi na Msaidizi Mkuu wa Akili Mnemba anayeongoza na kusimamia mfumo mzima wa biashara (EBS POS & ERP) kwa niaba ya Mmiliki au Meneja (Jukumu: ${userRole.toUpperCase()}, Jina: ${userName}).
        
HAIBA NA MTINDO WA MAZUNGUMZO (ACTIVE PERSONA: ${matchedPersona.name.toUpperCase()}):
- Toni na Mtindo: ${matchedPersona.tone}
- Maelekezo Maalum: ${matchedPersona.instruction}

SIFA ZA JUMLA:
1. Zungumza Kiswahili sanifu, fasaha, cha asili ya Kitanzania na Afrika Mashariki, chenye heshima na msisitizo thabiti wa kibiashara kama Gemini mwenyewe.
2. Kuwa kiongozi kamili wa mfumo: unaweza kumwelekeza au kumshauri mtumiaji kuhusu kila sehemu ya mfumo:
   - Mauzo & POS (utoaji wa risiti, udhibiti wa discount, miamala ya lipa namba na taslimu)
   - Stoo na Bidhaa (bidhaa zinazoisha, ununuzi mpya, bei za jumla na rejareja, tarehe za kuisha)
   - Faida na Hasara (Gross Margin, Net Profit, viashiria vya ukuaji)
   - Matumizi na Gharama (Expenses & Overhead costs)
   - Madeni na Wateja (udhibiti wa wateja sugu, ujumbe wa heshima wa kukumbusha madeni kwa WhatsApp)
   - Wafanyakazi na Tija (Performance, udhibiti wa upotevu, uzembe au wizi)
   - Bar & Mgahawa (Shots variance, chupa zilizofunguliwa, meza)
3. Toa majibu yaliyopangwa vizuri: nukta za wazi (bullet points), tarakimu sahihi zilizothibitishwa kwa TZS, na ushauri wa kimkakati wa hatua za kuchukua mara moja (Call to Action).
4. Unapoelekeza sehemu ya mfumo, taja jina la moduli husika (mfano: "Kwenye menyu ya Stoo", "Fungua POS", "Tazama Ripoti").

Takwimu Halisi za Biashara za Wakati Huu:
${JSON.stringify(safeContext, null, 2)}`;
      } else {
        systemInstruction = `Wewe ni "EBS AI" — Msaidizi Mahiri anayeongoza wafanyakazi wa kaunta na huduma (Jukumu la Mtumiaji: ${userRole.toUpperCase()}, Jina: ${userName}).
        
SIFA NA MAELEKEZO YA KAZI:
1. Zungumza Kiswahili sanifu, fasaha, chepesi, chenye uchangamfu na staha ya kiutendaji.
2. Saidia kikamilifu katika utendaji wa kila siku:
   - Kutafuta bei za bidhaa kwa wateja (bei ya rejareja au shots)
   - Kuangalia idadi ya bidhaa zilizobaki stoo (Stock Availability)
   - Kurekodi mauzo na kutoa risiti kwenye POS
   - Kuangalia orodha ya wateja na madeni yao
   - Kufunga shift na kuhesabu fedha za siku (Shift Closing reconciliation)
3. ZUIO KALI LA USALAMA (RBAC):
   - Hauruhusiwi KABISA kufichua faida ghafi (Gross Profit), faida halisi (Net Profit), bei za ununuzi za ndani, wala taarifa za siri za mmiliki.
   - Mtumiaji akiuliza kuhusu faida, mjibu kwa heshima na upole:
     "Samahani ${userName}, kama ${userRole === 'waiter' ? 'mhudumu' : userRole === 'storekeeper' ? 'mweka stoo' : 'keshia'}, ninaweza kukusaidia kuhusu bei za bidhaa, idadi ya stoo, madeni ya wateja au utaratibu wa mauzo. Taarifa za faida na ripoti za umiliki zimehifadhiwa kwa Mmiliki (Boss)."

Data Zilizoidhinishwa kwa Mtumishi:
${JSON.stringify(safeContext, null, 2)}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text || generateLocalAiResponse(message, safeContext, userRole);
      res.json({ reply, source: "gemini" });
    } catch (error: any) {
      console.error("AI Error:", error);
      const fallbackReply = generateLocalAiResponse(
        req.body.message || req.body.prompt || "",
        req.body.businessContext || req.body.businessData || {},
        req.body.userRole || req.body.role || "cashier"
      );
      res.json({ reply: fallbackReply, source: "local-fallback", error: error?.message });
    }
  });

  // Voice Command Endpoint (Gemini Voice Sales Parser - Section A)
  app.post("/api/ai/voice-command", async (req: Request, res: Response) => {
    try {
      const speechText = (req.body.speechText || req.body.text || "").trim();
      const products = Array.isArray(req.body.products) ? req.body.products : [];
      const hasPendingDraft = Boolean(req.body.hasPendingDraft);

      if (!speechText) {
        res.status(400).json({ error: "speechText is required" });
        return;
      }

      const ai = getAiClient();
      const lower = speechText.toLowerCase();

      // Check confirmation intent first
      const isConfirmSpeech =
        lower === "sawa" ||
        lower.includes("thibitisha") ||
        lower.includes("kamilisha") ||
        lower.includes("ndiyo") ||
        lower.includes("maliza") ||
        lower.includes("sawa sawa");

      const isReceiptSpeech =
        lower.includes("toa risiti") ||
        lower.includes("chapa risiti") ||
        lower.includes("onyesha risiti") ||
        lower.includes("print risiti") ||
        lower.includes("chapisha risiti");

      const isCancelSpeech =
        lower.includes("futa") ||
        lower.includes("sitisha") ||
        lower.includes("ghairi") ||
        lower.includes("acha");

      if (isReceiptSpeech) {
        res.json({
          action: "PRINT_RECEIPT",
          spokenResponse: "Nafungua risiti yako sasa hivi.",
          message: "Risiti inachapishwa...",
        });
        return;
      }

      if (isCancelSpeech && hasPendingDraft) {
        res.json({
          action: "CANCEL_SALE",
          spokenResponse: "Mauzo yamesitishwa.",
          message: "Mauzo yameghairiwa.",
        });
        return;
      }

      if (isConfirmSpeech && hasPendingDraft) {
        res.json({
          action: "CONFIRM_SALE",
          spokenResponse: "Mauzo yamethibitishwa na kukamilika. Je, ungependa kutoa risiti?",
          message: "Mauzo yamethibitishwa!",
        });
        return;
      }

      // If AI client is available, use Gemini to parse items and quantities accurately from natural Swahili
      if (ai) {
        const productCatalogSnippet = products.slice(0, 80).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.sellingPrice,
          category: p.category,
          stock: p.stockQty,
        }));

        const prompt = `Mtumiaji anasema hivi kwa sauti katika mfumo wa duka la POS nchini Tanzania:
"${speechText}"

Kazi yako:
1. Tambua kama hii ni amri ya kuuza bidhaa (CREATE_SALE), uthibitisho (CONFIRM_SALE), kutoa risiti (PRINT_RECEIPT), au swali lingine (QUERY).
2. Ikiwa ni mauzo (CREATE_SALE): Tambua bidhaa zilizotajwa na idadi yake kulingana na orodha ya bidhaa zilizopo stoo hapa chini.
3. Kila bidhaa ilinganishe na bidhaa iliyopo kwa kutoa id yake, jina sahihi, idadi (quantity), na bei (selling price).
4. Tengeneza sentensi fupi, rafiki na fasaha ya Kiswahili ya kujibu kwa sauti (spokenResponse) kumwambia cashier muhtasari na kumuuliza athibitishe ("Je, nithibitishe mauzo?"). Usikamilishe mauzo bado.

Orodha ya Bidhaa:
${JSON.stringify(productCatalogSnippet, null, 2)}

Jibu kwa muundo wa JSON pekee:
{
  "action": "CREATE_SALE" | "CONFIRM_SALE" | "PRINT_RECEIPT" | "CANCEL_SALE" | "QUERY",
  "items": [
    {
      "productId": "string",
      "productName": "string",
      "quantity": number,
      "unitPrice": number,
      "total": number
    }
  ],
  "totalAmount": number,
  "spokenResponse": "string (sentensi ya Kiswahili ya kuongea)"
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });

        try {
          const parsed = JSON.parse(response.text || "{}");
          res.json({
            action: parsed.action || "CREATE_SALE",
            items: parsed.items || [],
            totalAmount: parsed.totalAmount || (parsed.items || []).reduce((s: number, i: any) => s + (i.total || i.unitPrice * i.quantity), 0),
            spokenResponse: parsed.spokenResponse || `Nimeandaa muhtasari wa mauzo. Tafadhali thibitisha kukamilisha.`,
          });
          return;
        } catch {
          // fallback to local parser below
        }
      }

      // Local rule-based Swahili parser fallback
      const detectedItems: any[] = [];
      const swahiliNumbers: Record<string, number> = {
        moja: 1, mojaa: 1, mbili: 2, pili: 2, tatu: 3, nne: 4, tano: 5, sita: 6,
        saba: 7, nane: 8, tisa: 9, kumi: 10, kumi_na_moja: 11, kumi_na_mbili: 12,
      };

      for (const prod of products) {
        const prodNameLower = prod.name.toLowerCase();
        // Check if product name or words are in speech
        const nameKeywords = prodNameLower.split(/[\s-]+/).filter((w: string) => w.length > 2);
        const match = nameKeywords.some((kw: string) => lower.includes(kw));

        if (match) {
          // Detect quantity near keyword
          let qty = 1;
          const words = lower.split(/\s+/);
          for (let i = 0; i < words.length; i++) {
            const w = words[i];
            if (nameKeywords.some((kw: string) => words[i]?.includes(kw) || words[i - 1]?.includes(kw) || words[i + 1]?.includes(kw))) {
              // check surrounding words for number
              const prev = words[i - 1];
              const next = words[i + 1];
              if (prev && swahiliNumbers[prev]) qty = swahiliNumbers[prev];
              else if (next && swahiliNumbers[next]) qty = swahiliNumbers[next];
              else if (prev && !isNaN(Number(prev))) qty = Number(prev);
              else if (next && !isNaN(Number(next))) qty = Number(next);
            }
          }

          detectedItems.push({
            productId: prod.id,
            productName: prod.name,
            quantity: qty,
            unitPrice: prod.sellingPrice,
            total: prod.sellingPrice * qty,
          });
        }
      }

      if (detectedItems.length > 0) {
        const total = detectedItems.reduce((s, i) => s + i.total, 0);
        const summaryText = detectedItems.map((i) => `${i.productName} ${i.quantity}`).join(" na ");
        res.json({
          action: "CREATE_SALE",
          items: detectedItems,
          totalAmount: total,
          spokenResponse: `Nimeandaa mauzo ya ${summaryText}, jumla ni Shilingi ${total.toLocaleString()}. Je, nithibitishe mauzo?`,
        });
      } else {
        res.json({
          action: "QUERY",
          items: [],
          totalAmount: 0,
          spokenResponse: `Nimekuelewa: "${speechText}". Je, ungependa kuuza bidhaa gani?`,
        });
      }
    } catch (err: any) {
      console.error("Voice Command Error:", err);
      res.status(500).json({ error: err?.message || "Hitilafu wakati wa kuchakata sauti" });
    }
  });

  // In-memory TTS audio cache to prevent Gemini quota exhaustion and deliver instant playback
  const ttsAudioCache = new Map<string, { audioBase64: string; mimeType: string; sampleRate: number; voiceUsed: string }>();

  // Text-To-Speech endpoint for Voice playback in Swahili with multi-voice support
  app.post("/api/ai/tts", async (req: Request, res: Response) => {
    try {
      const text = (req.body.text || "").trim();
      const requestedVoice = (req.body.voiceName || req.body.voice || "Orbit").toString().trim();

      if (!text) {
        res.status(400).json({ error: "Text is required" });
        return;
      }

      // Direct prebuilt voices supported by Google Gemini (including Ursa, Vega, Capella, Orbit, Aoede, Kore, Fenrir, Puck, Charon)
      const GEMINI_VOICE_MAP: Record<string, string> = {
        ursa: "Ursa",
        vega: "Vega",
        capella: "Capella",
        orbit: "Orbit",
        pegasus: "Pegasus",
        flare: "Aoede",
        aoede: "Aoede",
        kore: "Kore",
        puck: "Puck",
        charon: "Charon",
        fenrir: "Fenrir",
      };

      const matchedVoice =
        GEMINI_VOICE_MAP[requestedVoice.toLowerCase()] || "Ursa";

      const cacheKey = `${requestedVoice.toLowerCase()}:${text.toLowerCase()}`;
      if (ttsAudioCache.has(cacheKey)) {
        const cached = ttsAudioCache.get(cacheKey)!;
        res.json({
          audioBase64: cached.audioBase64,
          mimeType: cached.mimeType,
          sampleRate: cached.sampleRate,
          voiceUsed: requestedVoice,
          geminiVoice: cached.voiceUsed,
          cached: true,
        });
        return;
      }

      // Prepare and normalize text for flawless, crystal-clear Swahili pronunciation
      const cleanSwahiliForSpeech = (raw: string): string => {
        let s = raw;
        // Strip code blocks and markdown styling
        s = s.replace(/```[\s\S]*?```/g, ' ');
        s = s.replace(/`([^`]+)`/g, '$1');
        s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
        s = s.replace(/\*([^*]+)\*/g, '$1');
        s = s.replace(/#+\s+/g, '');
        s = s.replace(/^[-*+]\s+/gm, '');
        // Normalize currency and common Tanzanian business abbreviations
        s = s.replace(/\b(?:TZS|TSh|TSH|Tsh)\.?\s*([0-9,.]+)/gi, 'shilingi $1');
        s = s.replace(/([0-9,.]+)\s*(?:TZS|TSh|TSH|Tsh)\b/gi, 'shilingi $1');
        s = s.replace(/\bPOS\b/gi, 'P-O-S');
        s = s.replace(/\bVAT\b/gi, 'kodi ya V-A-T');
        s = s.replace(/\bTIN\b/gi, 'T-I-N');
        s = s.replace(/\bVRN\b/gi, 'V-R-N');
        s = s.replace(/\bkg\b/gi, 'kilo');
        s = s.replace(/\bltr\b/gi, 'lita');
        s = s.replace(/\bpcs\b/gi, 'vipande');
        s = s.replace(/\bpkts\b/gi, 'pakiti');
        s = s.replace(/\bn\.?k\.?\b/gi, 'na kadhalika');
        s = s.replace(/%/g, ' asilimia');
        s = s.replace(/&/g, ' na ');
        // Remove multiple spaces/newlines
        return s.replace(/\s+/g, ' ').trim();
      };

      const speechText = cleanSwahiliForSpeech(text);

      const ai = getAiClient();
      if (!ai) {
        res.json({ audioBase64: null, useBrowserTts: true, voiceUsed: requestedVoice });
        return;
      }

      // Cascade across genuine Gemini TTS models to guarantee high availability and pristine audio
      const TTS_MODELS = [
        "gemini-3.8-flash-tts",
        "gemini-3.1-flash-tts-preview",
        "gemini-2.5-flash-preview-tts",
        "gemini-2.5-pro-preview-tts",
        "gemini-3.8-flash-lite-tts",
      ];

      let response: any = null;
      let usedModel = "";

      for (const modelName of TTS_MODELS) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: speechText,
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: matchedVoice },
                },
              },
            },
          });

          const p = response?.candidates?.[0]?.content?.parts?.[0];
          if (p?.inlineData?.data) {
            usedModel = modelName;
            break;
          }
        } catch (mErr: any) {
          console.warn(`TTS attempt with ${modelName} failed (${mErr?.message?.slice(0, 120)}), trying next model in cascade...`);
        }
      }

      const part = response?.candidates?.[0]?.content?.parts?.[0];
      const audioBase64 = part?.inlineData?.data;
      const returnedMimeType = part?.inlineData?.mimeType || "audio/wav";

      if (audioBase64) {
        const entry = {
          audioBase64,
          mimeType: returnedMimeType,
          sampleRate: 24000,
          voiceUsed: matchedVoice,
        };

        // Cache response (keep max 150 entries to prevent memory leak)
        if (ttsAudioCache.size > 150) {
          const firstKey = ttsAudioCache.keys().next().value;
          if (firstKey) ttsAudioCache.delete(firstKey);
        }
        ttsAudioCache.set(cacheKey, entry);

        res.json({
          ...entry,
          requestedVoice,
          cached: false,
        });
      } else {
        res.json({ audioBase64: null, useBrowserTts: true, voiceUsed: requestedVoice });
      }
    } catch (err: any) {
      console.warn("Gemini TTS Error (will use client browser speech synthesis):", err?.message);
      res.json({ audioBase64: null, useBrowserTts: true, error: err?.message, voiceUsed: req.body.voiceName || "Orbit" });
    }
  });

  // Parse Supplier Invoice / Price List (Bulk Import - Section C)
  app.post("/api/ai/parse-supplier-list", async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType, textData } = req.body;
      const ai = getAiClient();

      if (!ai) {
        res.status(503).json({
          error: "Gemini AI haipatikani kwa sasa. Tafadhali kagua API key au tumia fomu ya CSV.",
        });
        return;
      }

      const contents: any[] = [];
      if (imageBase64) {
        contents.push({
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: imageBase64.replace(/^data:[^;]+;base64,/, ""),
          },
        });
      }

      const promptText = `Wewe ni mtaalamu wa kusoma na kuchanganua ankara, orodha ya bei (Price List) na risiti za wasambazaji (Suppliers) nchini Tanzania.
Kazi yako ni kusoma picha/hati hii na kutoa orodha safi ya bidhaa katika muundo wa JSON.
Kwa kila bidhaa:
1. Jina la bidhaa (name): Safisha jina liwe wazi na la kibiashara.
2. Bei ya kununua (buyingPrice): Nambari kamili ya bei ya msambazaji kwa TZS (Currency: TZS).
3. Bei ya kuuza iliyopendekezwa (sellingPrice): Ongeza faida ya kadiri (takriban 20% hadi 35% juu ya bei ya kununua) ikiwa bei ya kuuza haijaandikwa wazi.
4. Idadi iliyopo (stockQty): Idadi ya vipimo au kreti/boksi. Ikiwa haijaandikwa weka 10.
5. Kategoria (category): Mfano 'Vinywaji', 'Vyakula', 'Dawa', 'Vifaa', 'Jumla'.
6. Kipimo (unit): Mfano 'Chupa', 'Pakiti', 'Boksi', 'Kreti', 'Kipande'.
7. Barcode au SKU: Ikiwa ipo, vinginevyo acha wazi.

Data ya ziada: ${textData || ""}

Rudisha JSON pekee:
{
  "supplierName": "Jina la msambazaji ikiwa linaonekana au null",
  "invoiceDate": "Tarehe ya ankara ikiwa ipo",
  "items": [
    {
      "name": "string",
      "buyingPrice": number,
      "sellingPrice": number,
      "stockQty": number,
      "category": "string",
      "unit": "string",
      "barcode": "string"
    }
  ]
}`;

      contents.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Parse Supplier List Error:", err);
      res.status(500).json({ error: err?.message || "Imeshindikana kuchanganua hati ya msambazaji" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EBS Server is running on http://0.0.0.0:${PORT}`);
  });
}

function generateLocalAiResponse(query: string, ctx: any, userRole: string = "cashier"): string {
  const q = (query || "").toLowerCase();
  const isExecutive = ["owner", "boss", "admin", "manager"].includes(userRole.toLowerCase());

  // Strict RBAC Guard: Block profit/executive secrets for cashiers, waiters, storekeepers
  if (!isExecutive && (q.includes("faida") || q.includes("profit") || q.includes("margin") || q.includes("gharama ya jumla") || q.includes("mapato ya biashara"))) {
    const roleName = userRole === "waiter" ? "mhudumu" : userRole === "storekeeper" ? "mweka stoo" : "keshia";
    return `🔒 **Ulinzi wa Taarifa za Biashara:**\n\nSamahani, kama **${roleName}**, huna ruhusa ya kufikia taarifa za faida ghafi au ripoti kuu za umiliki.\n\nNinaweza kukusaidia kwa furaha kuhusu:\n• Bei za bidhaa kwa wateja\n• Bidhaa zilizopo stoo au zinazoisha\n• Madeni ya wateja na orodha ya bidhaa\n• Kufunga mahesabu ya siku (Shift Close)`;
  }

  const salesToday = ctx?.salesToday || 0;
  const profitToday = ctx?.profitToday || 0;
  const expensesToday = ctx?.expensesToday || 0;
  const totalDebt = ctx?.totalDebt || 0;
  const lowStockCount = ctx?.lowStockCount || 0;
  const topProducts = ctx?.topProducts || [];
  const mode = ctx?.businessMode || "Duka";

  if (q.includes("mauzo") || q.includes("nimeuza")) {
    if (isExecutive) {
      return `📊 **Muhtasari wa Mauzo ya Leo (Boss Access):**\n\n• Jumla ya Mauzo: **TZS ${salesToday.toLocaleString()}**\n• Makadirio ya Faida ya Mauzo: **TZS ${profitToday.toLocaleString()}**\n• Gharama za Leo: **TZS ${expensesToday.toLocaleString()}**\n• Faida Halisi Baada ya Gharama: **TZS ${(profitToday - expensesToday).toLocaleString()}**\n\n💡 *Ushauri:* Hakikisha malipo yote ya fedha taslimu (Cash) na mitandao ya simu yamehesabiwa na kulinganishwa kabla ya kufunga siku.`;
    } else {
      return `📊 **Mauzo ya Leo:**\n\n• Jumla ya Mauzo Yaliyofanyika: **TZS ${salesToday.toLocaleString()}**\n\n💡 *Ushauri wa Keshia:* Kagua droo yako ya fedha taslimu na uhakikishe miamala yote ya simu imeingia kwenye mfumo.`;
    }
  }

  if (q.includes("bidhaa") || q.includes("inauza") || q.includes("maarufu")) {
    const prodList = topProducts.length > 0
      ? topProducts.map((p: any, i: number) => `${i + 1}. **${p.name}** — Imeuzwa: ${p.qty} (${p.revenue ? 'TZS ' + p.revenue.toLocaleString() : ''})`).join("\n")
      : "Hakuna miamala ya kutosha bado leo.";
    return `🏆 **Bidhaa Zinazoongoza kwa Mauzo:**\n\n${prodList}\n\n💡 *Ushauri:* Hakikisha bidhaa hizi hazikauki stoo kwa kuwasiliana na wasambazaji mapema.`;
  }

  if (q.includes("isha") || q.includes("stoo") || q.includes("stock")) {
    return `📦 **Hali ya Stoo na Bidhaa:**\n\n• Kuna bidhaa **${lowStockCount}** ambazo zimefikia au ziko chini ya kiwango cha tahadhari (Minimum Stock).\n• Nenda kwenye sehemu ya **Stoo / Bidhaa** kuona orodha na kurekodi manunuzi mapya kutoka kwa wasambazaji.`;
  }

  if (q.includes("madeni") || q.includes("deni") || q.includes("mkopo")) {
    return `💳 **Hali ya Mikopo na Madeni ya Wateja:**\n\n• Jumla ya madeni ambayo hayajalipwa: **TZS ${totalDebt.toLocaleString()}**\n\n💡 *Ushauri:* Weka ukomo wa mkopo (Credit Limit) kwa wateja wote na watumie vikumbusho vya malipo kwa wateja waliopitisha tarehe ya makubaliano.`;
  }

  if (isExecutive && (q.includes("faida") || q.includes("pungua"))) {
    return `📈 **Uchambuzi wa Faida na Gharama:**\n\n• Mauzo: **TZS ${salesToday.toLocaleString()}**\n• Faida Ghafi (Gross Profit): **TZS ${profitToday.toLocaleString()}**\n• Gharama za Uendeshaji: **TZS ${expensesToday.toLocaleString()}**\n• Faida Halisi (Net Profit): **TZS ${(profitToday - expensesToday).toLocaleString()}**\n\nIli kuongeza faida:\n1. Punguza gharama zisizo za lazima za kila siku.\n2. Weka mkazo kwenye bidhaa zenye faida kubwa kwa kila kipimo (kama vile Shots/Vinywaji vikali au bidhaa za bei ya jumla).`;
  }

  return `Habari! Mimi ni **EBS AI Msaidizi wa Biashara**.\n\nNipo hapa kukusaidia katika jukumu lako (${userRole.toUpperCase()}).\n\nUnaweza kuniuliza maswali kama:\n• *"Nimeuza kiasi gani leo?"*\n• *"Bidhaa gani imeuza zaidi leo?"*\n• *"Ni bidhaa zipi zinakaribia kuisha stoo?"*\n• *"Jumla ya madeni ya wateja ni kiasi gani?"*`;
}

startServer();
