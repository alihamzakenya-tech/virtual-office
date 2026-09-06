export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Groq API Key missing in Vercel environment variables.' });
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'user',
                        content: `You are an AI Routing Director. Categorize this command into one department: 'marketing', 'support', or 'logistics'.

Return ONLY valid raw JSON with this exact structure:
{"target_desk": "marketing", "action_summary": "Action description"}

Command: "${prompt}"`
                    }
                ],
                temperature: 0.1
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Groq API error' });
        }

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Serverless execution failed: ' + error.message });
    }
}
