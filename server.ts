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

  // AI Assistant endpoint
  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    try {
      const message = req.body.message || req.body.prompt;
      const businessContext = req.body.businessContext || req.body.businessData || {};

      if (!message || typeof message !== "string" || !message.trim()) {
        res.status(400).json({ error: "Message or prompt is required" });
        return;
      }

      const ai = getAiClient();
      if (!ai) {
        // Return a local intelligent fallback in Kiswahili if API key is not yet configured
        const reply = generateLocalAiResponse(message, businessContext);
        res.json({ reply, source: "local-engine" });
        return;
      }

      const systemInstruction = `Wewe ni "EBS AI Msaidizi wa Biashara" — mtaalamu mshauri wa biashara na mchambuzi wa mifumo ya biashara nchini Tanzania.
Unawasiliana kwa lugha ya Kiswahili fasaha, rahisi na cha kitaalamu cha kibiashara.
Unapewa data halisi za biashara (mauzo ya leo, faida, bidhaa zinazouzika, bidhaa zinazoisha, madeni ya wateja, gharama, na takwimu za Bar/Stoo).
Kanuni zako kuu:
1. Tumia data halisi zilizopo, usitunge namba au takwimu za uongo.
2. Nukuu fedha kwa Shilingi za Tanzania (TZS au Tsh).
3. Toa ushauri wenye tija wa kuongeza faida, kupunguza upotevu, kudhibiti madeni na kuboresha utendaji kazi wa wafanyakazi.
4. Kuhusu Bar na Stoo, tumia lugha ya staha na ya kitaalamu (kama vile "Tofauti ya stoo", "Upotevu/Wastage", "Inahitaji ukaguzi").
5. Jibu kwa muundo nadhifu wenye pointi (bullet points au aya fupi zinazosomeka kirahisi).

Data Halisi za Biashara Hivi Sasa:
${JSON.stringify(businessContext || {}, null, 2)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text || generateLocalAiResponse(message, businessContext);
      res.json({ reply, source: "gemini" });
    } catch (error: any) {
      console.error("AI Error:", error);
      // Graceful fallback to local analysis if Gemini call fails
      const fallbackReply = generateLocalAiResponse(
        req.body.message || req.body.prompt || "",
        req.body.businessContext || req.body.businessData || {}
      );
      res.json({ reply: fallbackReply, source: "local-fallback", error: error?.message });
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

function generateLocalAiResponse(query: string, ctx: any): string {
  const q = (query || "").toLowerCase();
  const salesToday = ctx?.salesToday || 0;
  const profitToday = ctx?.profitToday || 0;
  const expensesToday = ctx?.expensesToday || 0;
  const totalDebt = ctx?.totalDebt || 0;
  const lowStockCount = ctx?.lowStockCount || 0;
  const topProducts = ctx?.topProducts || [];
  const mode = ctx?.businessMode || "Duka";

  if (q.includes("mauzo") || q.includes("nimeuza")) {
    return `📊 **Muhtasari wa Mauzo ya Leo:**\n\n• Jumla ya Mauzo: **TZS ${salesToday.toLocaleString()}**\n• Makadirio ya Faida ya Mauzo: **TZS ${profitToday.toLocaleString()}**\n• Gharama za Leo: **TZS ${expensesToday.toLocaleString()}**\n• Faida Halisi Baada ya Gharama: **TZS ${(profitToday - expensesToday).toLocaleString()}**\n\n💡 *Ushauri:* Hakikisha malipo yote ya fedha taslimu (Cash) na mitandao ya simu yamehesabiwa na kulinganishwa kabla ya kufunga siku.`;
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

  if (q.includes("faida") || q.includes("pungua")) {
    return `📈 **Uchambuzi wa Faida na Gharama:**\n\n• Mauzo: **TZS ${salesToday.toLocaleString()}**\n• Faida Ghafi (Gross Profit): **TZS ${profitToday.toLocaleString()}**\n• Gharama za Uendeshaji: **TZS ${expensesToday.toLocaleString()}**\n• Faida Halisi (Net Profit): **TZS ${(profitToday - expensesToday).toLocaleString()}**\n\nIli kuongeza faida:\n1. Punguza gharama zisizo za lazima za kila siku.\n2. Weka mkazo kwenye bidhaa zenye faida kubwa kwa kila kipimo (kama vile Shots/Vinywaji vikali au bidhaa za bei ya jumla).`;
  }

  return `Habari! Mimi ni **EBS AI Msaidizi wa Biashara**. \n\nNipo hapa kukusaidia kuchambua mwenendo wa biashara yako (${mode}).\n\nUnaweza kuniuliza maswali kama:\n• *"Nimeuza kiasi gani leo?"*\n• *"Bidhaa gani imeuza zaidi leo?"*\n• *"Ni bidhaa zipi zinakaribia kuisha stoo?"*\n• *"Jumla ya madeni ya wateja ni kiasi gani?"*\n• *"Nipe ushauri wa kuboresha faida ya biashara yangu"*`;
}

startServer();
