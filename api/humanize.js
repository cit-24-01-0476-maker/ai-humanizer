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
        // පියවර 1: Model එක තෝරාගැනීම
        const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const modelsData = await modelsResponse.json();

        if (!modelsData.models) {
            return res.status(500).json({ error: 'Models ලිස්ට් එක ගන්න බැරි වුණා. API Key එකේ අවුලක් වෙන්න පුළුවන්.' });
        }

        let selectedModel = '';
        for (const model of modelsData.models) {
            if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes('generateContent')) {
                selectedModel = model.name;
                if (selectedModel.includes('flash')) break;
            }
        }

        if (!selectedModel) {
            return res.status(500).json({ error: 'ඔයාගේ ගිණුමට ගැලපෙන AI Model එකක් හොයාගන්න බැහැ.' });
        }

        // පියවර 2: Text එක Humanize කිරීම
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
        
        // --------------------------------------------------------
        // මේ කොටස තමයි අලුතින් දැම්මේ (Google සර්වර් Busy වෙලාවට)
        if (data.error && data.error.code === 503) {
            return res.status(503).json({ error: 'Google AI සර්වර් එක මේ වෙලාවේ ගොඩක් කාර්යබහුලයි (High Demand). කරුණාකර තත්පර 10කින් ආයෙත් ඔබන්න! ⏳' });
        }
        // --------------------------------------------------------
        
        if(data.candidates && data.candidates[0].content.parts[0].text) {
            res.status(200).json({ result: data.candidates[0].content.parts[0].text });
        } else {
            res.status(500).json({ error: data.error ? data.error.message : 'Generation Error' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server Error: ' + error.message });
    }
}