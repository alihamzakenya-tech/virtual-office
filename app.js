// DOM Elements
const startBtn = document.getElementById('start-btn');
const sendTextBtn = document.getElementById('send-text-btn');
const textCommandInput = document.getElementById('text-command');
const statusText = document.getElementById('status');
const activityLog = document.getElementById('activity-log');

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
}

// Log Activity to Terminal
function logActivity(message) {
    if (!activityLog) return;
    const logItem = document.createElement('div');
    logItem.className = 'log-entry';
    logItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    activityLog.prepend(logItem);
}

// Reset Active UI Desks
function clearActiveDesks() {
    document.querySelectorAll('.agent-card').forEach(desk => {
        desk.classList.remove('active');
    });
    document.querySelectorAll('.badge').forEach(badge => {
        badge.textContent = 'Idle';
        badge.style.backgroundColor = '#334155';
        badge.style.color = '#cbd5e1';
    });
}

// Highlight Selected Agent Card
function highlightDesk(deskType) {
    clearActiveDesks();
    const targetDesk = document.getElementById(`desk-${deskType}`);
    const targetBadge = document.getElementById(`badge-${deskType}`);

    if (targetDesk && targetBadge) {
        targetDesk.classList.add('active');
        targetBadge.textContent = 'Active Processing';
        targetBadge.style.backgroundColor = '#0284c7';
        targetBadge.style.color = '#ffffff';
    }
}

// Send Command to Vercel Serverless Function (Groq API)
async function sendToGroq(commandText) {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: commandText })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `Server error ${response.status}`);
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response structure received from API serverless function.');
    }

    let rawContent = data.choices[0].message.content;

    // Clean Markdown block wrapper if present
    rawContent = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(rawContent);
}

// Process Command Function
async function processCommand(command) {
    if (!command) return;

    clearActiveDesks();
    if (statusText) statusText.textContent = `Status: Processing "${command}"...`;
    logActivity(`Command Received: "${command}"`);

    try {
        const result = await sendToGroq(command);
        const desk = result.target_desk ? result.target_desk.toLowerCase() : 'support';
        
        highlightDesk(desk);
        logActivity(`Routed to ${desk.toUpperCase()}: ${result.action_summary}`);
        
        if (statusText) {
            statusText.textContent = `Status: Command successfully routed to ${desk.toUpperCase()}`;
        }
    } catch (err) {
        console.error('Routing Error:', err);
        if (statusText) statusText.textContent = 'Status: Failed to process command.';
        logActivity(`Error: ${err.message || 'Routing failed'}`);
    }
}

// Event Listener for Voice Command Button
if (startBtn) {
    startBtn.addEventListener('click', () => {
        if (!recognition) {
            alert("Aapka browser Web Speech API support nahi karta. Text input use karein.");
            return;
        }

        clearActiveDesks();
        if (statusText) statusText.textContent = 'Status: Listening... Speak now!';
        logActivity('Voice recognition started.');

        try {
            recognition.start();
        } catch (e) {
            console.log('Recognition already active:', e);
        }
    });
}

// Speech Recognition Callbacks
if (recognition) {
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        processCommand(transcript);
    };

    recognition.onerror = (event) => {
        console.error('Speech Recognition Error:', event.error);
        if (statusText) statusText.textContent = `Status: Speech Error (${event.error})`;
        logActivity(`Speech Error: ${event.error}`);
    };

    recognition.onend = () => {
        if (statusText && statusText.textContent.includes('Listening')) {
            statusText.textContent = 'Status: Waiting for command...';
        }
    };
}

// Event Listener for Text Command Button
if (sendTextBtn && textCommandInput) {
    sendTextBtn.addEventListener('click', () => {
        const command = textCommandInput.value.trim();
        if (command) {
            processCommand(command);
            textCommandInput.value = '';
        }
    });

    textCommandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const command = textCommandInput.value.trim();
            if (command) {
                processCommand(command);
                textCommandInput.value = '';
            }
        }
    });
}
