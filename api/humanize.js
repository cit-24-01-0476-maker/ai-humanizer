export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed"
    });
  }

  try {
    const { text } = req.body || {};

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

    const models = ["gemini-3.5-flash", "gemini-2.5-flash"];

    let lastError = null;

    for (const model of models) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
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
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        lastError = data;
        console.error(`Gemini API Error with ${model}:`, data);
        continue;
      }

      const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!result) {
        lastError = {
          error: {
            message: "No text returned from Gemini API"
          }
        };
        continue;
      }

      return res.status(200).json({
        result: result,
        model: model
      });
    }

    return res.status(500).json({
      error: lastError?.error?.message || "Gemini API error. All models failed."
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error: "Something went wrong! Please try again."
    });
  }
}