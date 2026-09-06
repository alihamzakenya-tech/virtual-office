export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Groq API Key missing in environment variables.' });
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mixtral-8x7b-32768',
                messages: [
                    {
                        role: 'user',
                        content: `You are an AI Routing Director of a Virtual Office.
Categorize this command into one of these departments: 'marketing', 'support', or 'logistics'.

Return ONLY raw JSON with no Markdown or text wrappers in this schema:
{
  "target_desk": "marketing" | "support" | "logistics",
  "action_summary": "Short explanation of action"
}

User Command: "${prompt}"`
                    }
                ],
                temperature: 0.1
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Error response from Groq API' });
        }

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Serverless execution failed: ' + error.message });
    }
}
