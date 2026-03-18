import type { VercelRequest, VercelResponse } from "@vercel/node";

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

const SYSTEM_PROMPT =
  'Du er en vennlig og litt humoristisk assistent for et innovasjonsteam i en norsk kommune. Generer en kort, unik velkomst-hilsen på norsk (maks 8 ord) til brukeren. Hilsenen skal ha lett design thinking- eller lean startup-preg — gjerne en liten metafor, et konstruktivt spark eller en leken referanse til eksperimentering, læring eller iterasjon. Ikke bruk "Hei" som første ord. Returner kun hilsenen, ingen forklaringer.';

const MODELS = [
  "google/gemini-2.0-flash-lite",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

function getStaticGreeting(name: string): string {
  return `Klar for ukespeil, ${name}?`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const rawName = Array.isArray(req.query.name)
      ? req.query.name[0]
      : req.query.name;
    const name = rawName?.trim();

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res
        .status(500)
        .json({ error: "OPENROUTER_API_KEY is not configured" });
    }

    for (const model of MODELS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              max_tokens: 60,
              messages: [
                {
                  role: "system",
                  content: SYSTEM_PROMPT,
                },
                {
                  role: "user",
                  content: `Generer en hilsen til ${name}`,
                },
              ],
            }),
            signal: controller.signal,
          },
        );

        const data = (await response.json().catch(() => null)) as
          | OpenRouterResponse
          | null;

        if (!response.ok) {
          const errorMessage = data?.error?.message;
          if (errorMessage?.includes("No endpoints found")) {
            continue;
          }
          return res
            .status(200)
            .json({ greeting: getStaticGreeting(name) });
        }

        const greeting = data?.choices?.[0]?.message?.content?.trim();

        if (greeting) {
          return res.status(200).json({ greeting });
        }

        return res.status(200).json({ greeting: getStaticGreeting(name) });
      } catch {
        return res.status(200).json({ greeting: getStaticGreeting(name) });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return res.status(200).json({ greeting: getStaticGreeting(name) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
