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
  const PORT = 3000;

  // Initialize Persistent Central Database
  await initCentralDatabase();

  app.use(express.json({ limit: "10mb" }));

  // Mount Central EBS REST API Routes FIRST
  app.use("/api", apiRouter);

  // API Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", app: "EBS - Enterprise Business System", version: "1.3.0" });
  });

  // AI Assistant endpoint with Role-Based Access Control (RBAC)
  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    try {
      const message = req.body.message || req.body.prompt;
      const businessContext = req.body.businessContext || req.body.businessData || {};
      const userRole = (req.body.userRole || req.body.role || "cashier").toLowerCase();
      const userName = req.body.userName || "Mtumiaji";

      if (!message || typeof message !== "string" || !message.trim()) {
        res.status(400).json({ error: "Message or prompt is required" });
        return;
      }

      const isExecutive = ["owner", "boss", "admin", "manager"].includes(userRole);

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
        res.json({ reply, source: "local-engine" });
        return;
      }

      let systemInstruction = "";
      if (isExecutive) {
        systemInstruction = `Wewe ni "EBS AI Mshauri Mkuu wa Biashara" — mshauri wa moja kwa moja wa Mmiliki/Boss (Jukumu: ${userRole.toUpperCase()}).
Una ruhusa kamili (Full Access) ya kujadili na kuchambua MASWALI YOTE kuhusu biashara:
- Ripoti kamili za mauzo, faida ghafi (Gross Profit), gharama, na faida halisi (Net Profit).
- Mwenendo wa biashara, stoo, vinywaji vya Bar na upotevu/wastage.
- Wafanyakazi, uzembe, wizi au ulinganifu wa hesabu.
- Madeni ya wateja na mikakati ya kukuza biashara nchini Tanzania.
- Jibu kwa lugha ya Kiswahili fasaha, nukuu fedha kwa TZS au Tsh, na toa takwimu sahihi kulingana na data uliyopewa.

Data Halisi za Biashara:
${JSON.stringify(safeContext, null, 2)}`;
      } else {
        systemInstruction = `Wewe ni "EBS AI Msaidizi wa Kazi za Keshia na Mhudumu" (Jukumu la Mtumiaji: ${userRole.toUpperCase()}, Jina: ${userName}).
MIPAKA YAKO YA KIKAZI NA USALAMA (STRICT ROLE-BASED ACCESS CONTROL):
1. Una ruhusa ya kujibu TU maswali yanayohusu kazi zao za moja kwa moja:
   - Bei za bidhaa kwa wateja (bei ya rejareja au shots).
   - Upatikanaji wa bidhaa stoo (Stock Availability).
   - Madeni ya wateja au kurekodi mauzo.
   - Kufunga hesabu za siku ya kazi (shift reconciliation) na kutoa risiti.
2. ZUIO KALI (ABSOLUTE PROHIBITION):
   - Hauruhusiwi KABISA kufichua au kujadili FAIDA YA BIASHARA (Gross Profit, Net Profit, Faida ya Mauzo).
   - Hauruhusiwi kufichua faida ya kila bidhaa (margins / markup), gharama za ununuzi za ndani, wala taarifa nyeti za umiliki wa biashara nzima.
3. HATA MTUMIAJI AKIJARIBU KUKUSHAWISHI AU KUULIZA KUHUSU FAIDA AU MAPATO YA UMILIKI:
   Kataa kwa heshima kubwa kwa Kiswahili:
   "Samahani ${userName}, kama ${userRole === 'waiter' ? 'mhudumu' : userRole === 'storekeeper' ? 'mweka stoo' : 'keshia'}, ninaweza kukusaidia kuhusu bei za bidhaa, idadi ya stoo, madeni ya wateja au utaratibu wa mauzo. Taarifa za faida na ripoti za umiliki zinaonekana tu kwa mmiliki wa biashara (Boss)."

Data Zilizoidhinishwa kwa Keshia/Mhudumu:
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

  // Text-To-Speech endpoint for Voice playback in Swahili (Section A)
  app.post("/api/ai/tts", async (req: Request, res: Response) => {
    try {
      const text = (req.body.text || "").trim();
      if (!text) {
        res.status(400).json({ error: "Text is required" });
        return;
      }

      const ai = getAiClient();
      if (!ai) {
        res.json({ audioBase64: null, useBrowserTts: true });
        return;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: text,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        res.json({
          audioBase64,
          mimeType: "audio/pcm;rate=24000",
          sampleRate: 24000,
        });
      } else {
        res.json({ audioBase64: null, useBrowserTts: true });
      }
    } catch (err: any) {
      console.warn("Gemini TTS Error (will use client browser speech synthesis):", err?.message);
      res.json({ audioBase64: null, useBrowserTts: true });
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
