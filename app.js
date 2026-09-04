async function processCommandWithGroq(userCommand) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are the central router for an AI Virtual Office. Analyze the user command and categorize it into ONE of these agents: "marketing", "support", or "logistics".
                        Respond ONLY with pure raw JSON without markdown syntax. Format:
                        {"agent": "marketing", "action": "Brief action text"}`
                    },
                    { role: 'user', content: userCommand }
                ],
                temperature: 0.1
            })
        });

        const data = await response.json();
        let rawContent = data.choices[0].message.content.trim();
        
        // Clean markdown backticks if returned
        rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const aiResponse = JSON.parse(rawContent);
        triggerAgent(aiResponse.agent, aiResponse.action);

    } catch (error) {
        console.error('Groq API Error:', error);
        logBox.innerHTML += `<br><span style="color: #ef4444;">[AI Error] ${error.message}</span>`;
    }
}
