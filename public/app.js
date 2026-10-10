// --- UI STATE ---
let sessionId = null;
let numericMenu = false; // Whether the keypad should only accept digits (server-driven)
let pendingRequest = false;

const chatContainer = document.getElementById('chatContainer');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const restartBtn = document.getElementById('restartBtn');
const keyCallBtn = document.getElementById('keyCallBtn');
const keyDeleteBtn = document.getElementById('keyDeleteBtn');
const numberKeys = document.querySelectorAll('[data-key]');
const phoneShell = document.getElementById('phoneShell');
const interfaceToggle = document.getElementById('interfaceToggle');
const phoneModeLabel = document.getElementById('phoneModeLabel');
const multiTapCharacters = {
    '1': '.,?!1',
    '2': 'ABC2',
    '3': 'DEF3',
    '4': 'GHI4',
    '5': 'JKL5',
    '6': 'MNO6',
    '7': 'PQRS7',
    '8': 'TUV8',
    '9': 'WXYZ9',
    '*': "'-@",
    '#': '()'
};
let lastMultiTap = { key: '', time: 0, index: 0 };

sendBtn.addEventListener('click', handleUserSubmit);
interfaceToggle.addEventListener('click', togglePhoneInterface);
keyCallBtn.addEventListener('click', handleUserSubmit);
keyDeleteBtn.addEventListener('click', () => {
    chatInput.value = chatInput.value.slice(0, -1);
    resetMultiTap();
    chatInput.focus();
});
numberKeys.forEach((button) => {
    let longPressTimer;

    button.addEventListener('pointerdown', () => {
        if (isNumericMenuState()) return;
        button.longPressHandled = false;
        longPressTimer = setTimeout(() => {
            button.longPressHandled = true;
            resetMultiTap();
            chatInput.value += button.dataset.key;
            chatInput.focus();
        }, 550);
    });
    button.addEventListener('pointerup', () => clearTimeout(longPressTimer));
    button.addEventListener('pointerleave', () => clearTimeout(longPressTimer));
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    button.addEventListener('click', () => {
        if (button.longPressHandled) {
            button.longPressHandled = false;
            return;
        }

        const key = button.dataset.key;
        if (isNumericMenuState()) {
            if (/^\d$/.test(key)) chatInput.value += key;
        } else if (key === '0') {
            chatInput.value += ' ';
            resetMultiTap();
        } else {
            enterMultiTapCharacter(key);
        }
        chatInput.focus();
    });
});
chatInput.addEventListener('input', resetMultiTap);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleUserSubmit();
    }
});
restartBtn.addEventListener('click', startConversation);

window.onload = startConversation;

function isNumericMenuState() {
    return numericMenu;
}

function resetMultiTap() {
    lastMultiTap = { key: '', time: 0, index: 0 };
}

function enterMultiTapCharacter(key) {
    const characters = multiTapCharacters[key];
    if (!characters) return;

    const now = Date.now();
    const canCycle = lastMultiTap.key === key &&
        now - lastMultiTap.time < 900 &&
        chatInput.value.length > 0;

    if (canCycle) {
        const previousCharacter = chatInput.value.slice(-1);
        const nextIndex = (lastMultiTap.index + 1) % characters.length;
        chatInput.value = chatInput.value.slice(0, -1) + characters[nextIndex];
        lastMultiTap.index = nextIndex;
        lastMultiTap.time = now;
        if (previousCharacter === ' ') resetMultiTap();
        return;
    }

    chatInput.value += characters[0];
    lastMultiTap = { key, time: now, index: 0 };
}

function togglePhoneInterface() {
    const touchscreenMode = phoneShell.classList.toggle('touchscreen-mode');
    interfaceToggle.setAttribute('aria-pressed', String(touchscreenMode));
    interfaceToggle.textContent = touchscreenMode ? 'Use button phone' : 'Use touchscreen';
    phoneModeLabel.textContent = touchscreenMode
        ? 'TOUCHSCREEN PHONE · DEMO ONLY'
        : 'BUTTON PHONE · DEMO ONLY';
}

async function startConversation() {
    chatContainer.innerHTML = `
        <div class="text-center text-xs text-slate-500/70 my-2 uppercase tracking-wider font-semibold bg-black/5 rounded-full mx-auto px-3 py-1">
            Today
        </div>`;
    chatContainer.appendChild(typingIndicator);
    chatInput.value = '';
    chatInput.placeholder = 'Text first...';
    sessionId = null;
    numericMenu = false;
    pendingRequest = false;
    hideTyping();

    try {
        const res = await fetch('/api/session', { method: 'POST' });
        if (!res.ok) throw new Error(`Session request failed (${res.status})`);
        applySessionInfo(await res.json());
    } catch (error) {
        console.error('Could not start session:', error);
        addMessage('Service unavailable. Please check that the server is running and press restart.', 'bot');
    }
}

function applySessionInfo(info) {
    if (info.sessionId) sessionId = info.sessionId;
    numericMenu = Boolean(info.numericMenu);
}

function handleUserSubmit() {
    const text = chatInput.value.trim();
    if (!text || pendingRequest) return;

    addMessage(text, 'user');
    chatInput.value = '';
    resetMultiTap();
    sendToServer(text);
}

async function sendToServer(text) {
    pendingRequest = true;
    showTyping();
    const minimumTypingDelay = wait(500 + Math.random() * 500);

    try {
        const res = await fetch('/api/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, text })
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || `Request failed (${res.status})`);

        await minimumTypingDelay;
        hideTyping();
        applySessionInfo(payload);
        await showReplies(payload.replies || []);
    } catch (error) {
        console.error('Message failed:', error);
        await minimumTypingDelay;
        hideTyping();
        addMessage('Connection problem. Please try sending that again.', 'bot');
    } finally {
        pendingRequest = false;
    }
}

async function showReplies(replies) {
    for (let i = 0; i < replies.length; i++) {
        const { text, delayMs } = replies[i];
        if (i > 0 || delayMs > 0) {
            showTyping();
            await wait(delayMs || 0);
            hideTyping();
        }
        addMessage(text, 'bot');
    }
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function addMessage(content, sender) {
    const isUser = sender === 'user';
    const wrapper = document.createElement('div');
    wrapper.className = `flex ${isUser ? 'justify-end' : 'justify-start'} w-full message-pop`;

    const bubble = document.createElement('div');

    if (isUser) {
        bubble.className = "message-bubble bg-[#d9fdd3] text-slate-800 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] shadow-sm text-[15px] leading-relaxed relative";
        bubble.textContent = content; // Prevent XSS

        const tail = document.createElement('div');
        tail.className = "absolute top-0 -right-2 w-3 h-4 bg-[#d9fdd3]";
        tail.style.clipPath = "polygon(0 0, 0 100%, 100% 0)";
        bubble.appendChild(tail);
    } else {
        bubble.className = "message-bubble bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] shadow-sm text-[15px] leading-relaxed relative";
        bubble.innerHTML = content;

        const tail = document.createElement('div');
        tail.className = "absolute top-0 -left-2 w-3 h-4 bg-white border-t border-l border-slate-100";
        tail.style.clipPath = "polygon(100% 0, 0 0, 100% 100%)";
        bubble.appendChild(tail);
    }

    const timeSpan = document.createElement('span');
    timeSpan.className = "block text-right text-[10px] text-slate-500 mt-2 leading-none";
    timeSpan.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isUser) timeSpan.innerHTML += ' <i class="fa-solid fa-check-double text-[#53bdeb] ml-1"></i>';

    bubble.appendChild(timeSpan);
    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);
    chatContainer.appendChild(typingIndicator); // Keep indicator at bottom

    scrollToBottom();
}

function showTyping() {
    typingIndicator.classList.remove('hidden');
    scrollToBottom();
}

function hideTyping() {
    typingIndicator.classList.add('hidden');
}

function scrollToBottom() {
    setTimeout(() => chatContainer.scrollTop = chatContainer.scrollHeight, 10);
}
