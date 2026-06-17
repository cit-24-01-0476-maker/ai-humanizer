export default async function handler(req, res) {
    // CORS Headers (App එකට ඕන නිසා)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    try {
        // පියවර 1: පවතින Models ලැයිස්තුව ගැනීම
        const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const modelsData = await modelsResponse.json();

        // පියවර 2: Flash Model එකක් තෝරාගැනීම (වඩාත් ස්ථාවර)
        const flashModel = modelsData.models.find(m => m.name.includes('gemini-1.5-flash') && m.supportedGenerationMethods.includes('generateContent'));
        
        if (!flashModel) {
            return res.status(500).json({ error: 'ගැලපෙන AI Model එකක් හමු නොවීය.' });
        }

        // පියවර 3: නිවැරදි URL ආකෘතියෙන් Request කිරීම
        // මෙතනදී "models/model-name" කියන කොටස URL එකට දානවා
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${flashModel.name}:generateContent?key=${apiKey}`;

        const generateResponse = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: "Please rewrite the following text to sound more natural, human-like, and conversational. Do not add extra comments, just provide the humanized text: \n\n" + text }]
                }]
            })
        });

        const data = await generateResponse.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            res.status(200).json({ result: data.candidates[0].content.parts[0].text });
        } else {
            res.status(500).json({ error: 'Generation Error: ' + JSON.stringify(data) });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server Error: ' + error.message });
    }
}