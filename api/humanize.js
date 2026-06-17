export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text } = req.body;
    // Vercel එකේ අපි හංගන API Key එක මෙතනින් ගන්නවා
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key is missing in Vercel' });
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: "Please rewrite the following text to sound more natural, human-like, and conversational. Do not add extra comments, just provide the humanized text: \n\n" + text }]
                }]
            })
        });

        const data = await response.json();
        
        if(data.candidates && data.candidates[0].content.parts[0].text) {
            res.status(200).json({ result: data.candidates[0].content.parts[0].text });
        } else {
            res.status(500).json({ error: 'Failed to generate content' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}