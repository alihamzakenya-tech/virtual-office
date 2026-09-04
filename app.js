const startBtn = document.getElementById('start-btn');
const statusText = document.getElementById('status');
const logBox = document.getElementById('log-box');

// Groq API Key Config
const GROQ_API_KEY = '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';

window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!window.SpeechRecognition) {
    alert("Aapka browser voice recognition support nahi karta. Chrome use karein!");
} else {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    startBtn.addEventListener('click', () => {
        recognition.start();
        statusText.innerText = "Status: Listening... Speak now!";
    });

    recognition.onresult = async (event) => {
        const speechToText = event.results[0][0].transcript;
        statusText.innerText = `Command Heard: "${speechToText}"`;
        logBox.innerHTML += `<br>> User commanded: ${speechToText}`;
        logBox.innerHTML += `<br><span style="color: #3b82f6;">[AI Brain] Processing with Groq LLM...</span>`;

        // Send voice command to Groq LLM for Intent Recognition
        await processCommandWithGroq(speechToText);
    };

    recognition.onerror = () => {
        statusText.innerText = "Status: Error occurred. Try again.";
    };
}

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
                        Return ONLY a valid JSON object in this format:
                        {"agent": "marketing" | "support" | "logistics", "action": "Brief summary of what the agent should do"}`
                    },
                    { role: 'user', content: userCommand }
                ],
                temperature: 0.1
            })
        });

        const data = await response.json();
        const aiResponse = JSON.parse(data.choices[0].message.content);
        
        triggerAgent(aiResponse.agent, aiResponse.action);

    } catch (error) {
        console.error('Groq API Error:', error);
        logBox.innerHTML += `<br><span style="color: #ef4444;">[AI Error] Failed to process command via Groq.</span>`;
    }
}

function triggerAgent(agentId, actionText) {
    document.querySelectorAll('.desk').forEach(d => {
        d.classList.remove('active');
        d.querySelector('.badge').innerText = 'Idle';
        d.querySelector('.badge').className = 'badge idle';
    });

    const activeDesk = document.getElementById(`agent-${agentId}`);
    if (activeDesk) {
        activeDesk.classList.add('active');
        const badge = activeDesk.querySelector('.badge');
        badge.innerText = 'Working...';
        badge.className = 'badge working';
    }

    logBox.innerHTML += `<br><span style="color: #22c55e;">[AI Agent Active] Target: ${agentId.toUpperCase()} - Action: ${actionText}</span>`;
}
