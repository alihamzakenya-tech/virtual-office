const startBtn = document.getElementById('start-btn');
const statusText = document.getElementById('status');
const logBox = document.getElementById('log-box');

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

    recognition.onresult = (event) => {
        const speechToText = event.results[0][0].transcript.toLowerCase();
        statusText.innerText = `Command Heard: "${speechToText}"`;

        logBox.innerHTML += `<br>> User commanded: ${speechToText}`;

        if (speechToText.includes('marketing') || speechToText.includes('campaign')) {
            triggerAgent('marketing', 'Running Marketing Campaign...');
        } else if (speechToText.includes('support') || speechToText.includes('chat')) {
            triggerAgent('support', 'Handling WhatsApp Customer Chats...');
        } else if (speechToText.includes('logistics') || speechToText.includes('delivery')) {
            triggerAgent('logistics', 'Checking Courier & Number Plates...');
        } else {
            logBox.innerHTML += `<br>System: Agent not recognized for this command.`;
        }
    };

    recognition.onerror = (event) => {
        statusText.innerText = "Status: Error occurred. Try again.";
    };
}

function triggerAgent(agentId, actionText) {
    document.querySelectorAll('.desk').forEach(d => {
        d.classList.remove('active');
        d.querySelector('.badge').innerText = 'Idle';
        d.querySelector('.badge').className = 'badge idle';
    });

    const activeDesk = document.getElementById(`agent-${agentId}`);
    activeDesk.classList.add('active');

    const badge = activeDesk.querySelector('.badge');
    badge.innerText = 'Working...';
    badge.className = 'badge working';

    logBox.innerHTML += `<br><span style="color: #22c55e;">[AI Agent Active] ${actionText}</span>`;
}