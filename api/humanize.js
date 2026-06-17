export default async function handler(req, res) {
    // CORS Headers: App එකෙන් එන Request වලට ඉඩ දීම
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight OPTIONS request එකට පිළිතුරු දීම
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST request එකක් පමණක් බාර ගැනීම
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        
        // ස්ථායී මොඩල් නම භාවිතා කිරීම
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
        
        if (!response.ok) {
            return res.status(response.status).json({ 
                error: data.error?.message || 'API Error', 
                code: response.status 
            });
        }

        // ප්‍රතිඵලය ලබා ගැනීම
        const result = data.candidates[0].content.parts[0].text;
        
        res.status(200).json({ result: result });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong! Please try again.' });
    }
}