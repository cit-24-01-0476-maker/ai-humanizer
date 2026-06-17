export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Browser eken API eka test karanna
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "Humanize API is working"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed"
    });
  }

  try {
    let body = req.body;

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const { text } = body || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        error: "Text is required"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing. Add it in Vercel Environment Variables."
      });
    }

    const prompt = `
Rewrite the following text to make it sound natural, simple, and human-written.
Keep the original meaning.
Do not add extra information.
Do not make it too advanced.
Return only the rewritten text.

Text:
${text}
`;

    // High demand error avoid karanna fallback models
    const models = [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-3.5-flash"
    ];

    let lastErrorMessage = "Gemini API error";

    for (const model of models) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          const geminiResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 600
              }
            })
          });

          const rawText = await geminiResponse.text();

          let data;
          try {
            data = JSON.parse(rawText);
          } catch (parseError) {
            lastErrorMessage = "Invalid response from Gemini API";
            continue;
          }

          if (!geminiResponse.ok) {
            const apiError =
              data.error?.message ||
              data.error ||
              "Gemini API request failed";

            lastErrorMessage = apiError;

            console.error(`Gemini error | Model: ${model} | Attempt: ${attempt}`, data);

            const isBusyError =
              geminiResponse.status === 429 ||
              geminiResponse.status === 503 ||
              String(apiError).toLowerCase().includes("high demand") ||
              String(apiError).toLowerCase().includes("overloaded") ||
              String(apiError).toLowerCase().includes("quota");

            if (isBusyError) {
              await wait(900 * attempt);
              continue;
            }

            break;
          }

          const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

          if (!result) {
            lastErrorMessage = "No text returned from Gemini API";
            continue;
          }

          return res.status(200).json({
            result: result,
            model: model
          });

        } catch (error) {
          lastErrorMessage = error.message || "Network error";
          console.error(`Server fetch error | Model: ${model} | Attempt: ${attempt}`, error);
          await wait(900 * attempt);
        }
      }
    }

    return res.status(503).json({
      error:
        "Gemini models are busy right now. Please wait 10 seconds and try again.",
      details: lastErrorMessage
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error: "Something went wrong! Please try again.",
      details: error.message
    });
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}