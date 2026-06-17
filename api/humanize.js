module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key එක Vercel එකට සම්බන්ධ වෙලා නැහැ!' });
    }

    try {
        // පියවර 1: ඔයාගේ API Key එකට වැඩ කරන Models මොනවද කියලා Google එකෙන් ඇසීම
        const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const modelsData = await modelsResponse.json();

        if (!modelsData.models) {
            return res.status(500).json({ error: 'Models ලිස්ට් එක ගන්න බැරි වුණා. API Key එකේ අවුලක් වෙන්න පුළුවන්.' });
        }

        // පියවර 2: වැඩ කරන හොඳම Model එක තනියම තෝරාගැනීම
        let selectedModel = '';
        for (const model of modelsData.models) {
            if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes('generateContent')) {
                selectedModel = model.name; // උදාහරණයක් විදියට "models/gemini-1.5-flash" තෝරගනීවි
                if (selectedModel.includes('flash')) break; // Flash එක වේගවත් නිසා ඒක හම්බුණොත් කෙලින්ම ඒක ගන්නවා
            }
        }

        if (!selectedModel) {
            return res.status(500).json({ error: 'ඔයාගේ ගිණුමට ගැලපෙන AI Model එකක් හොයාගන්න බැහැ.' });
        }

        // පියවර 3: තෝරගත්ත Model එක පාවිච්චි කරලා Text එක Humanize කිරීම
        const generateResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: "Please rewrite the following text to sound more natural, human-like, and conversational. Do not add extra comments, just provide the humanized text: \n\n" + text }]
                }]
            })
        });

        const data = await generateResponse.json();
        
        if(data.candidates && data.candidates[0].content.parts[0].text) {
            res.status(200).json({ result: data.candidates[0].content.parts[0].text });
        } else {
            res.status(500).json({ error: 'Generation Error: ' + JSON.stringify(data) });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server Error: ' + error.message });
    }
}