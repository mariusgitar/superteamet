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
  "mistralai/mistral-small-2603",
  "openrouter/hunter-alpha",
  "google/gemini-2.5-flash-lite",
];

function getStaticGreeting(name: string): string {
  return `Klar for en ny uke, ${name}?`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { searchParams } = new URL(
    req.url ?? "/api/greeting",
    `https://${req.headers.host ?? "localhost"}`,
  );
  const name = searchParams.get("name")?.trim() || "deg";

  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    console.log("API key present:", !!process.env.OPENROUTER_API_KEY);

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(200).json({ greeting: getStaticGreeting(name) });
    }

    for (const model of MODELS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      let response: Response | undefined;
      let responseBody: string | undefined;

      try {
        console.log("Trying model:", model);

        response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            signal: controller.signal,
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
          },
        );

        responseBody = await response.text();
        const data = JSON.parse(responseBody) as OpenRouterResponse;

        if (!response.ok) {
          const errorMessage = data?.error?.message;
          if (errorMessage?.includes("No endpoints found")) {
            continue;
          }
          throw new Error(errorMessage ?? `OpenRouter error: ${response.status}`);
        }

        const greeting = data?.choices?.[0]?.message?.content?.trim();

        if (!greeting) {
          throw new Error("Empty response");
        }

        return res.status(200).json({ greeting });
      } catch (err) {
        console.error("Greeting API error:", err);
        console.error("OpenRouter response status:", response?.status);
        console.error("OpenRouter response body:", responseBody);
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return res.status(200).json({ greeting: getStaticGreeting(name) });
  } catch {
    return res.status(200).json({ greeting: getStaticGreeting(name) });
  }
}
