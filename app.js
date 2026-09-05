// Desk DOM elements
const marketingDesk = document.getElementById('marketing-desk');
const supportDesk = document.getElementById('support-desk');
const logisticsDesk = document.getElementById('logistics-desk');
const statusText = document.getElementById('status-text');
const activityLog = document.getElementById('activity-log');

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.lang = 'en-US';

function logActivity(message) {
    const logItem = document.createElement('div');
    logItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    activityLog.prepend(logItem);
}

function clearActiveDesks() {
    marketingDesk.classList.remove('active');
    supportDesk.classList.remove('active');
    logisticsDesk.classList.remove('active');
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
        
        // Clean markdown blocks if Groq wraps response in ```json ... ```
        const rawContent = data.choices[0].message.content;
        const cleanedJSON = rawContent.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanedJSON);
    } catch (error) {
        console.error('Groq Router Error:', error);
        throw error;
    }
}

// Voice Command Listener
function startListening() {
    clearActiveDesks();
    statusText.textContent = 'Listening for command...';
    logActivity('Voice recognition started.');
    recognition.start();
}

recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    statusText.textContent = `Processing: "${transcript}"`;
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
        
        statusText.textContent = `Command routed to ${result.target_desk.toUpperCase()}`;
        
        if (result.target_desk === 'marketing') {
            marketingDesk.classList.add('active');
        } else if (result.target_desk === 'support') {
            supportDesk.classList.add('active');
        } else if (result.target_desk === 'logistics') {
            logisticsDesk.classList.add('active');
        }
    } catch (err) {
        statusText.textContent = 'Failed to route command. Check console logs.';
        logActivity('Routing Error: Could not connect to backend serverless function.');
    }
};

recognition.onerror = (event) => {
    statusText.textContent = 'Speech recognition error. Try again.';
    logActivity(`Speech Error: ${event.error}`);
};

recognition.onend = () => {
    if (statusText.textContent === 'Listening for command...') {
        statusText.textContent = 'Waiting for command...';
    }
};
