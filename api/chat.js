export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Groq API Key missing in environment variables.' });
    }

    const candidateModels = [
        'llama-3.1-8b-instant',
        'llama-3.3-70b-versatile',
        'openai/gpt-oss-20b'
    ];

    let lastError = null;

    for (const modelName of candidateModels) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an AI Routing Director. Categorize the user prompt into one desk: "marketing", "support", or "logistics". Also provide a professional, helpful execution response or draft text. Respond ONLY with valid raw JSON object matching schema: {"target_desk": "marketing" | "support" | "logistics", "action_summary": "short explanation", "agent_response": "Detailed draft or response from the agent"}. Do not add backticks or markdown formatting.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.1
                })
            });

            const data = await response.json();

            if (response.ok && data.choices && data.choices.length > 0) {
                return res.status(200).json(data);
            } else {
                lastError = data.error?.message || `Model ${modelName} returned status ${response.status}`;
            }
        } catch (err) {
            lastError = err.message;
        }
    }

    return res.status(500).json({ 
        error: `All candidate models failed. Last error: ${lastError}` 
    });
}
