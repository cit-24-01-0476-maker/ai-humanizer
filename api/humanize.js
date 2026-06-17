export default async function handler(req, res) {
    // 1. CORS Security හෙවත් App එකෙන් එන Request වලට ඉඩ දීම (CORS Headers)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight OPTIONS request එකට OK කියන්න
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST request එකක් නෙමෙයි නම් Error එකක් යවන්න
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // 2. Google Gemini API එකට කතා කිරීම
        const apiKey = process.env.GEMINI_API_KEY; // ඔයාගේ Vercel එකේ තියෙන API Key එක
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const prompt = `Rewrite the following text to make it sound completely natural, conversational, and written by a real human. Remove any AI-sounding tone. Text: ${text}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        const data = await response.json();
        
        // Error ආවොත් (උදාහරණයක් විදියට 503 High Demand Error)
        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'API Error', code: response.status });
        }

        const result = data.candidates[0].content.parts[0].text;
        
        // ප්‍රතිඵලය ආපසු යැවීම
        res.status(200).json({ result: result });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong! Please try again.' });
    }
}