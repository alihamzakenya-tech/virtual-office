// DOM Elements
const startBtn = document.getElementById('start-btn');
const statusText = document.getElementById('status');
const activityLog = document.getElementById('activity-log') || document.querySelector('.terminal');

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
} else {
    alert("Aapka browser Speech Recognition support nahi karta. Please Google Chrome use karein!");
}

function logActivity(message) {
    if (!activityLog) return;
    const logItem = document.createElement('div');
    logItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    activityLog.prepend(logItem);
}

function clearActiveDesks() {
    document.querySelectorAll('.agent-card, .desk').forEach(desk => desk.classList.remove('active'));
}

// Groq API Routing Request
async function sendToGroq(prompt) {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
    });

    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    const cleanedJSON = rawContent.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedJSON);
}

// Event Listener for Speak Command Button
if (startBtn) {
    startBtn.addEventListener('click', () => {
        if (!recognition) return;
        clearActiveDesks();
        if (statusText) statusText.textContent = 'Status: Listening... Speak now!';
        logActivity('Voice recognition started.');
        
        try {
            recognition.start();
        } catch (e) {
            console.log('Recognition active:', e);
        }
    });
}

if (recognition) {
    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        if (statusText) statusText.textContent = `Status: Processing "${transcript}"`;
        logActivity(`Voice Input: "${transcript}"`);

        const routingPrompt = `
You are the AI Routing Director of a Virtual Office. 
Categorize the user command into: 'marketing', 'support', or 'logistics'.

Return JSON only:
{
  "target_desk": "marketing" | "support" | "logistics",
  "action_summary": "Brief summary of action"
}

User Command: "${transcript}"
`;

        try {
            const result = await sendToGroq(routingPrompt);
            logActivity(`Routed to ${result.target_desk.toUpperCase()}: ${result.action_summary}`);
            if (statusText) statusText.textContent = `Status: Command routed to ${result.target_desk.toUpperCase()}`;
        } catch (err) {
            if (statusText) statusText.textContent = 'Status: Failed to route command.';
            logActivity('Routing Error: Check serverless backend execution.');
        }
    };

    recognition.onerror = (event) => {
        if (statusText) statusText.textContent = `Status: Error (${event.error})`;
        logActivity(`Speech Error: ${event.error}`);
    };

    recognition.onend = () => {
        if (statusText && statusText.textContent.includes('Listening')) {
            statusText.textContent = 'Status: Waiting for command...';
        }
    };
}
