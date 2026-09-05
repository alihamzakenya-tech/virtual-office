// Desk DOM elements
const marketingDesk = document.getElementById('marketing-desk');
const supportDesk = document.getElementById('support-desk');
const logisticsDesk = document.getElementById('logistics-desk');
const statusText = document.getElementById('status-text');
const activityLog = document.getElementById('activity-log');
const startBtn = document.querySelector('button') || document.getElementById('start-btn');

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.lang = 'en-US';

function logActivity(message) {
    if (!activityLog) return;
    const logItem = document.createElement('div');
    logItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    activityLog.prepend(logItem);
}

function clearActiveDesks() {
    marketingDesk?.classList.remove('active');
    supportDesk?.classList.remove('active');
    logisticsDesk?.classList.remove('active');
}

// Secure Serverless Groq Router API Call
async function sendToGroq(prompt) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            throw new Error(`Server response error: ${response.status}`);
        }

        const data = await response.json();
        const rawContent = data.choices[0].message.content;
        const cleanedJSON = rawContent.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanedJSON);
    } catch (error) {
        console.error('Groq Router Error:', error);
        throw error;
    }
}

// Voice Command Start Function
function startListening() {
    clearActiveDesks();
    if (statusText) statusText.textContent = 'Status: Listening... Speak now!';
    logActivity('Voice recognition started.');
    try {
        recognition.start();
    } catch (e) {
        console.log('Recognition already running');
    }
}

// Button Click Event Listener
if (startBtn) {
    startBtn.addEventListener('click', startListening);
}

recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    if (statusText) statusText.textContent = `Processing: "${transcript}"`;
    logActivity(`Voice Input: "${transcript}"`);

    const routingPrompt = `
You are the AI Routing Director of a Virtual Office. 
Categorize the following user voice command into one of three departments: 'marketing', 'support', or 'logistics'.

Provide a JSON output matching this schema:
{
  "target_desk": "marketing" | "support" | "logistics",
  "action_summary": "Brief explanation of what needs to be done",
  "confidence": number
}

User Voice Command: "${transcript}"
`;

    try {
        const result = await sendToGroq(routingPrompt);
        logActivity(`Routed to ${result.target_desk.toUpperCase()} desk. Summary: ${result.action_summary}`);
        
        if (statusText) statusText.textContent = `Command routed to ${result.target_desk.toUpperCase()}`;
        
        if (result.target_desk === 'marketing' && marketingDesk) {
            marketingDesk.classList.add('active');
        } else if (result.target_desk === 'support' && supportDesk) {
            supportDesk.classList.add('active');
        } else if (result.target_desk === 'logistics' && logisticsDesk) {
            logisticsDesk.classList.add('active');
        }
    } catch (err) {
        if (statusText) statusText.textContent = 'Failed to route command. Check console logs.';
        logActivity('Routing Error: Could not connect to backend serverless function.');
    }
};

recognition.onerror = (event) => {
    if (statusText) statusText.textContent = 'Speech recognition error. Try again.';
    logActivity(`Speech Error: ${event.error}`);
};

recognition.onend = () => {
    if (statusText && statusText.textContent.includes('Listening')) {
        statusText.textContent = 'Status: Waiting for command...';
    }
};
