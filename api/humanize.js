export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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

    const model = "gemini-2.5-flash";

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `
Rewrite the following text to make it sound natural, simple, and human-written.
Keep the original meaning.
Do not add extra information.
Do not make it too advanced.
Return only the rewritten text.

Text:
${text}
`;

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
    } catch (error) {
      return res.status(500).json({
        error: "Invalid response from Gemini API",
        details: rawText.slice(0, 200)
      });
    }

    if (!geminiResponse.ok) {
      console.error("Gemini API Error:", data);

      return res.status(geminiResponse.status).json({
        error: data.error?.message || "Gemini API error",
        code: geminiResponse.status
      });
    }

    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!result) {
      return res.status(500).json({
        error: "No text returned from Gemini API"
      });
    }

    return res.status(200).json({
      result: result
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error: "Something went wrong! Please try again.",
      details: error.message
    });
  }
}