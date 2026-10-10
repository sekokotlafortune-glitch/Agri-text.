/* Agri text — SMS relay simulation
 *
 * Farm phone (2G) ──SMS──▶ Mobile network ──SMS──▶ Gateway smartphone (4G+)
 *                                                   │ HTTPS
 *                                                   ▼
 *                                              Agri text AI ──▶ live weather / geocoding APIs
 * …and the reply travels back the same way as SMS.
 */

const FARM_NUMBER = '+27 71 234 5678';
const GATEWAY_NUMBER = '+27 82 000 3456';
const HOP_MS = 900;               // Visual time for one SMS hop in the diagram
const MIN_AI_MS = 700;            // Minimum time the AI node stays "thinking" so the step is visible
const API_LABELS = {
    'open-meteo-geocoding': 'Open‑Meteo Geocoding',
    'open-meteo-forecast': 'Open‑Meteo Forecast',
    'zippopotam': 'Zippopotam'
};

const sim = {
    sessionId: null,
    numericMenu: false,
    busy: false,
    relayed: 0,
    apiCalls: 0,
    apiMsTotal: 0
};

// ---------- Elements ----------
const $ = (id) => document.getElementById(id);
const remoteThread = $('remoteThread');
const remoteInput = $('remoteInput');
const remoteComposer = $('remoteComposer');
const remoteCounter = $('remoteCounter');
const gatewayFeed = $('gatewayFeed');
const gwStatus = $('gwStatus');
const gwDot = $('gwDot');
const eventLog = $('eventLog');
const diagramCaption = $('diagramCaption');
const restartBtn = $('restartBtn');
const keyCallBtn = $('keyCallBtn');
const keyDeleteBtn = $('keyDeleteBtn');
const numberKeys = document.querySelectorAll('[data-key]');
const nodes = {
    farm: $('nodeFarm'),
    net: $('nodeNet'),
    gateway: $('nodeGateway'),
    server: $('nodeServer')
};
const edges = {
    farmNet: $('edgeFarmNet'),
    netGw: $('edgeNetGw'),
    gwServer: $('edgeGwServer'),
    serverApis: $('edgeServerApis')
};

// ---------- Keypad (multi-tap, like a real feature phone) ----------
const multiTapCharacters = {
    '1': '.,?!1', '2': 'ABC2', '3': 'DEF3', '4': 'GHI4', '5': 'JKL5',
    '6': 'MNO6', '7': 'PQRS7', '8': 'TUV8', '9': 'WXYZ9', '*': "'-@", '#': '()'
};
let lastMultiTap = { key: '', time: 0, index: 0 };

function resetMultiTap() {
    lastMultiTap = { key: '', time: 0, index: 0 };
}

function enterMultiTapCharacter(key) {
    const characters = multiTapCharacters[key];
    if (!characters) return;
    const now = Date.now();
    const canCycle = lastMultiTap.key === key && now - lastMultiTap.time < 900 && remoteInput.value.length > 0;

    if (canCycle) {
        const nextIndex = (lastMultiTap.index + 1) % characters.length;
        remoteInput.value = remoteInput.value.slice(0, -1) + characters[nextIndex];
        lastMultiTap.index = nextIndex;
        lastMultiTap.time = now;
    } else {
        remoteInput.value += characters[0];
        lastMultiTap = { key, time: now, index: 0 };
    }
    updateCounter();
}

numberKeys.forEach((button) => {
    let longPressTimer;
    button.addEventListener('pointerdown', () => {
        if (sim.numericMenu) return;
        button.longPressHandled = false;
        longPressTimer = setTimeout(() => {
            button.longPressHandled = true;
            resetMultiTap();
            remoteInput.value += button.dataset.key;
            updateCounter();
            remoteInput.focus();
        }, 550);
    });
    button.addEventListener('pointerup', () => clearTimeout(longPressTimer));
    button.addEventListener('pointerleave', () => clearTimeout(longPressTimer));
    button.addEventListener('contextmenu', (e) => e.preventDefault());
    button.addEventListener('click', () => {
        if (button.longPressHandled) {
            button.longPressHandled = false;
            return;
        }
        const key = button.dataset.key;
        if (sim.numericMenu) {
            if (/^\d$/.test(key)) remoteInput.value += key;
            updateCounter();
        } else if (key === '0') {
            remoteInput.value += ' ';
            resetMultiTap();
            updateCounter();
        } else {
            enterMultiTapCharacter(key);
        }
        remoteInput.focus();
    });
});

keyDeleteBtn.addEventListener('click', () => {
    remoteInput.value = remoteInput.value.slice(0, -1);
    resetMultiTap();
    updateCounter();
    remoteInput.focus();
});
keyCallBtn.addEventListener('click', submitFromFarmPhone);
remoteComposer.addEventListener('submit', (e) => {
    e.preventDefault();
    submitFromFarmPhone();
});
remoteInput.addEventListener('input', () => {
    resetMultiTap();
    updateCounter();
});
restartBtn.addEventListener('click', startSimulation);

// ---------- Clocks ----------
function tickClocks() {
    const now = new Date();
    const hhmm = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $('fClock').textContent = hhmm;
    $('sClock').textContent = hhmm;
}
setInterval(tickClocks, 1000);
tickClocks();

// ---------- Boot ----------
window.addEventListener('load', startSimulation);

async function startSimulation() {
    sim.generation = (sim.generation || 0) + 1; // invalidates any relay still in flight
    outbox.length = 0;
    sim.sessionId = null;
    sim.numericMenu = false;
    sim.busy = false;
    sim.relayed = 0;
    sim.apiCalls = 0;
    sim.apiMsTotal = 0;
    updateStats();

    remoteThread.replaceChildren(el('div', 'fthread__empty', 'No messages. Write to Agri text to begin.'));
    gatewayFeed.replaceChildren(buildFeedEmpty());
    eventLog.replaceChildren(el('li', 'timeline__empty', 'Waiting for the first SMS…'));
    remoteInput.value = '';
    updateCounter();
    resetDiagram();
    setGatewayStatus('Connected · listening for SMS');
    diagramCaption.textContent = 'Idle — type a message on the farm phone to begin.';

    try {
        const res = await fetch('/api/session', { method: 'POST' });
        if (!res.ok) throw new Error(`Session request failed (${res.status})`);
        applySessionInfo(await res.json());
    } catch (error) {
        console.error('Could not start session:', error);
        setGatewayStatus('Agri text API unreachable', 'error');
        setNode('server', 'error', 'Offline');
        logEvent('err', 'Gateway could not reach the Agri text server', 'Check that the Node server is running');
    }
}

function applySessionInfo(info) {
    if (info.sessionId) sim.sessionId = info.sessionId;
    sim.numericMenu = Boolean(info.numericMenu);
    $('statSession').textContent = sim.sessionId ? sim.sessionId.slice(0, 8) : '—';
    remoteInput.placeholder = sim.numericMenu ? 'Reply with a number' : 'Write message';
}

// ---------- The relay flow ----------
const outbox = [];

function submitFromFarmPhone() {
    const text = remoteInput.value.trim();
    if (!text) return;
    remoteInput.value = '';
    updateCounter();
    resetMultiTap();
    outbox.push(text);
    drainOutbox();
}

// Messages are relayed one at a time, in the order they were sent.
async function drainOutbox() {
    if (sim.busy) return;
    while (outbox.length) {
        const text = outbox.shift();
        try {
            await relayMessage(text);
        } catch (error) {
            if (error.name !== 'RestartError') console.error('Relay aborted:', error);
            sim.busy = false;
            if (error.name === 'RestartError') return;
        }
    }
}

async function relayMessage(text) {
    sim.busy = true;
    resetDiagram();
    eventLog.querySelector('.timeline__empty')?.remove();
    const groupStart = true;

    // 1. Farm phone sends the SMS over 2G
    const seg = smsSegments(text);
    const outgoing = addFarmSms(text, 'out');
    setNode('farm', 'active', 'Sending');
    diagramCaption.textContent = 'Farm phone is sending an SMS over the 2G network…';
    logEvent('farm', `Farm phone sent SMS to Agri text`, `${seg.chars} chars · ${seg.count} segment${seg.count > 1 ? 's' : ''} · ${seg.encoding}`, groupStart);

    await pulse(edges.farmNet, 'fwd');
    setNode('farm', 'done', 'Sent');
    setNode('net', 'active', 'Routing');
    logEvent('net', 'Mobile network accepted the message', `SMS centre → ${GATEWAY_NUMBER}`);

    await pulse(edges.netGw, 'fwd');
    outgoing.setState('sent');
    setNode('net', 'done', 'Delivered');

    // 2. Gateway smartphone receives it
    setNode('gateway', 'active', 'Received');
    setGatewayStatus('Incoming SMS · forwarding to Agri text', 'busy');
    diagramCaption.textContent = 'Gateway received the SMS and is forwarding it to Agri text AI over 4G+.';
    gatewayFeed.querySelector('.gfeed__empty')?.remove();
    addGatewayCard({
        type: 'in',
        title: `Incoming SMS · ${FARM_NUMBER}`,
        body: text,
        plain: true,
        chips: [`${seg.count} seg · ${seg.encoding}`, `${seg.chars} chars`]
    });
    logEvent('gw', 'Gateway smartphone received the SMS', `Forwarding over HTTPS to the Agri text API`);
    await wait(350);

    // 3. Gateway calls the Agri text AI
    const aiCard = addGatewayCard({ type: 'ai', title: 'Agri text AI', pending: true });
    setNode('gateway', 'active', 'Forwarding');
    setNode('server', 'active', 'Thinking');
    logEvent('ai', 'Agri text AI is processing the request');
    const aiStarted = performance.now();
    const edgePromise = pulse(edges.gwServer, 'fwd');

    let payload;
    let elapsed = 0;
    try {
        const res = await fetch('/api/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: sim.sessionId, text })
        });
        elapsed = Math.round(performance.now() - aiStarted);
        payload = await res.json();
        if (!res.ok) throw new Error(payload.error || `Request failed (${res.status})`);
    } catch (error) {
        console.error('Relay failed:', error);
        await edgePromise;
        await handleFailure(aiCard, error);
        sim.busy = false;
        return;
    }

    await edgePromise;
    const trace = payload.trace || [];
    await replayApiTrace(trace, aiCard);

    if (performance.now() - aiStarted < MIN_AI_MS) await wait(MIN_AI_MS - (performance.now() - aiStarted));

    applySessionInfo(payload);
    const replies = payload.replies || [];
    aiCard.resolve(replies.map((r) => r.text).join('<hr class="gcard__sep">'), elapsed, trace);
    setNode('server', 'done', `${elapsed} ms`);
    setEdgeLive(edges.serverApis, false);
    diagramCaption.textContent = `Agri text AI replied in ${elapsed} ms — relaying ${replies.length} SMS back to the farm phone.`;
    logEvent('ai', `Agri text AI replied with ${replies.length} message${replies.length > 1 ? 's' : ''}`, `${elapsed} ms end‑to‑end · ${trace.length} live API call${trace.length === 1 ? '' : 's'}`);

    await pulse(edges.gwServer, 'back');

    // 4. Gateway sends each reply back as SMS
    for (let i = 0; i < replies.length; i++) {
        const reply = replies[i];
        if (i > 0 && reply.delayMs) await wait(Math.min(reply.delayMs, 800));
        const rseg = smsSegments(reply.text);

        setNode('gateway', 'active', 'Sending SMS');
        setGatewayStatus(`Sending SMS ${i + 1}/${replies.length} to ${FARM_NUMBER}`, 'busy');
        const outCard = addGatewayCard({
            type: 'out',
            title: `Outgoing SMS · ${FARM_NUMBER}`,
            body: reply.text,
            chips: [`${rseg.count} seg · ${rseg.encoding}`, `${rseg.chars} chars`],
            status: 'sending'
        });
        logEvent('gw', `Gateway sent reply SMS ${i + 1}/${replies.length}`, `${rseg.chars} chars · ${rseg.count} segment${rseg.count > 1 ? 's' : ''} · ${rseg.encoding}`);

        setNode('net', 'active', 'Routing');
        await pulse(edges.netGw, 'back');
        setNode('farm', 'active', 'Receiving');
        await pulse(edges.farmNet, 'back');

        outCard.setStatus('delivered');
        addFarmSms(reply.text, 'in');
        sim.relayed++;
        updateStats();
        logEvent('farm', `Farm phone received SMS ${i + 1}/${replies.length}`);
        setNode('net', 'done', 'Delivered');
    }

    setNode('gateway', 'done', 'Relayed');
    setNode('farm', 'done', 'Received');
    setGatewayStatus('Connected · listening for SMS');
    diagramCaption.textContent = `Done — ${replies.length} reply SMS delivered to the farm phone. Waiting for the next message.`;
    sim.busy = false;
    remoteInput.focus();
}

async function handleFailure(aiCard, error) {
    aiCard.fail(error.message);
    setNode('server', 'error', 'Error');
    setNode('gateway', 'error', 'Failed');
    setGatewayStatus('Agri text API error', 'error');
    diagramCaption.textContent = 'The gateway could not reach Agri text AI. Sending a service notice to the farm phone.';
    logEvent('err', 'Agri text API request failed', error.message);

    const notice = 'Agri text is temporarily unavailable. Please try again in a moment.';
    const outCard = addGatewayCard({ type: 'err', title: `Service notice · ${FARM_NUMBER}`, body: notice, plain: true, status: 'sending' });
    await pulse(edges.netGw, 'back');
    await pulse(edges.farmNet, 'back');
    outCard.setStatus('delivered');
    addFarmSms(notice, 'in');
    setGatewayStatus('Connected · listening for SMS');
}

// Replays the server-side API trace so the diagram shows which live endpoints were hit.
async function replayApiTrace(trace, aiCard) {
    if (trace.length === 0) return;
    setEdgeLive(edges.serverApis, true);
    for (const call of trace) {
        const row = document.querySelector(`.api[data-api="${call.api}"]`);
        const label = API_LABELS[call.api] || call.host;
        setApiRow(row, 'active', '…');
        logEvent('api', `Live API call · ${label}`, `${call.host}${call.path} → ${call.ok ? `HTTP ${call.status}` : (call.error || `HTTP ${call.status}`)} · ${call.ms} ms`);
        aiCard.addApi(label, call);
        pulse(edges.serverApis, 'fwd');
        await wait(Math.min(Math.max(call.ms, 350), 900));
        setApiRow(row, call.ok ? 'done' : 'error', `${call.ms} ms`);
        sim.apiCalls++;
        sim.apiMsTotal += call.ms;
        updateStats();
    }
    await pulse(edges.serverApis, 'back');
}

// ---------- Farm phone (2G) rendering ----------
function addFarmSms(text, direction) {
    remoteThread.querySelector('.fthread__empty')?.remove();
    const sms = el('div', `fsms fsms--${direction}`);
    const body = el('div', 'fsms__body');
    if (direction === 'out') body.textContent = text;
    else body.innerHTML = text; // Server-authored HTML (line breaks only)
    const meta = el('div', 'fsms__meta');
    meta.dataset.state = direction === 'out' ? 'sending' : 'received';
    const time = el('span', '', timeNow());
    meta.appendChild(time);
    if (direction === 'out') {
        const label = el('span', '', 'Sending…');
        meta.appendChild(label);
        sms.setState = (state) => {
            meta.dataset.state = state;
            label.textContent = state === 'sent' ? 'Sent' : 'Sending…';
            if (state === 'sent') meta.appendChild(svgIcon('i-check'));
        };
    } else {
        meta.prepend(el('span', '', 'From Agri text'));
    }
    sms.append(body, meta);
    remoteThread.appendChild(sms);
    scrollToEnd(remoteThread);
    return sms;
}

// ---------- Gateway smartphone rendering ----------
function addGatewayCard({ type, title, body = '', plain = false, chips = [], pending = false, status = null }) {
    const card = el('article', `gcard gcard--${type}`);
    const head = el('div', 'gcard__head');
    head.append(svgIcon(type === 'in' ? 'i-arrow-down' : type === 'out' ? 'i-arrow-up' : type === 'ai' ? 'i-sparkle' : 'i-alert'));
    head.append(el('span', '', title));
    const time = document.createElement('time');
    time.textContent = timeNow();
    head.append(time);

    const content = el('div', 'gcard__body');
    if (pending) {
        content.innerHTML = 'Analysing request<span class="dots"><i></i><i></i><i></i></span>';
    } else if (plain) {
        content.textContent = body;
    } else {
        content.innerHTML = body;
    }

    const meta = el('div', 'gcard__meta');
    chips.forEach((c) => meta.append(chip(c)));
    let statusChip = null;
    if (status) {
        statusChip = chip('Sending…', 'busy');
        meta.append(statusChip);
    }

    const apiList = el('div', 'gcard__apis');
    card.append(head, content, apiList, meta);
    gatewayFeed.appendChild(card);
    scrollToEnd(gatewayFeed);

    card.setStatus = (state) => {
        if (!statusChip) return;
        statusChip.className = `chip ${state === 'delivered' ? 'chip--ok' : 'chip--busy'}`;
        statusChip.replaceChildren(svgIcon(state === 'delivered' ? 'i-check-double' : 'i-arrow-up'), document.createTextNode(state === 'delivered' ? 'Delivered' : 'Sending…'));
        scrollToEnd(gatewayFeed);
    };
    card.addApi = (label, call) => {
        const row = el('div', `gcard__api${call.ok ? '' : ' is-error'}`);
        row.append(svgIcon('i-globe'), el('span', '', label), el('b', '', `${call.ok ? 'OK' : 'ERR'} · ${call.ms} ms`));
        apiList.appendChild(row);
        scrollToEnd(gatewayFeed);
    };
    card.resolve = (html, ms, trace) => {
        content.innerHTML = html;
        meta.replaceChildren(chip(`${ms} ms`, 'ok'), chip(`${trace.length} live API call${trace.length === 1 ? '' : 's'}`), chip('Reply → SMS'));
        scrollToEnd(gatewayFeed);
    };
    card.fail = (message) => {
        card.classList.remove('gcard--ai');
        card.classList.add('gcard--err');
        content.textContent = message || 'Request failed';
        meta.replaceChildren(chip('Failed', 'err'));
        scrollToEnd(gatewayFeed);
    };
    return card;
}

function buildFeedEmpty() {
    const wrap = el('div', 'gfeed__empty');
    wrap.append(svgIcon('i-smartphone'), el('p', '', 'Incoming SMS from registered farm phones will appear here and be forwarded to Agri text AI automatically.'));
    return wrap;
}

function setGatewayStatus(text, tone = 'ok') {
    gwStatus.textContent = text;
    gwDot.className = `gapp__dot${tone === 'busy' ? ' is-busy' : tone === 'error' ? ' is-error' : ''}`;
}

// ---------- Diagram ----------
function setNode(name, state, label) {
    const node = nodes[name];
    node.classList.remove('is-active', 'is-done', 'is-error');
    if (state !== 'idle') node.classList.add(`is-${state}`);
    const pill = node.querySelector('.node__status');
    pill.dataset.status = state;
    pill.textContent = label;
}

function setApiRow(row, state, label) {
    if (!row) return;
    row.classList.remove('is-active', 'is-done', 'is-error');
    if (state !== 'idle') row.classList.add(`is-${state}`);
    const pill = row.querySelector('.api__status');
    pill.dataset.status = state;
    pill.textContent = label;
}

function setEdgeLive(edge, live) {
    edge.classList.toggle('is-live', live);
}

function pulse(edge, direction) {
    const cls = direction === 'fwd' ? 'is-fwd' : 'is-back';
    edge.classList.remove(cls);
    void edge.offsetWidth; // restart the CSS animation
    edge.classList.add(cls, 'is-live');
    return wait(HOP_MS).then(() => {
        edge.classList.remove(cls);
        if (edge !== edges.serverApis) edge.classList.remove('is-live');
    });
}

function resetDiagram() {
    Object.keys(nodes).forEach((n) => setNode(n, 'idle', 'Idle'));
    Object.values(edges).forEach((e) => e.classList.remove('is-live', 'is-fwd', 'is-back'));
    document.querySelectorAll('.api').forEach((row) => setApiRow(row, 'idle', '—'));
}

// ---------- Timeline ----------
function logEvent(kind, text, detail = '', groupStart = false) {
    const li = el('li', `tl tl--${kind}${groupStart ? ' tl--group' : ''}`);
    const icon = el('span', 'tl__icon');
    icon.append(svgIcon({
        farm: 'i-feature-phone', net: 'i-tower', gw: 'i-smartphone', ai: 'i-sparkle', api: 'i-globe', err: 'i-alert'
    }[kind] || 'i-check'));
    const body = el('div', 'tl__text', text);
    if (detail) body.append(el('small', '', detail));
    li.append(el('span', 'tl__time', timeNow(true)), icon, body);
    eventLog.appendChild(li);
    scrollToEnd(eventLog);
}

// ---------- Stats ----------
function updateStats() {
    $('statRelayed').textContent = String(sim.relayed);
    $('statApiCalls').textContent = String(sim.apiCalls);
    $('statLatency').textContent = sim.apiCalls ? `${Math.round(sim.apiMsTotal / sim.apiCalls)} ms` : '—';
}

function updateCounter() {
    const seg = smsSegments(remoteInput.value);
    const per = seg.encoding === 'GSM-7' ? 160 : 70;
    remoteCounter.textContent = `${seg.chars}/${seg.count > 1 ? `${seg.count}×` : ''}${per}`;
}

// SMS segment maths: GSM-7 gives 160 chars per message (153 when concatenated),
// anything outside the GSM alphabet (e.g. emoji) forces UCS-2 at 70 (67) per segment.
const GSM7 = /^[A-Za-z0-9 @£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà\n\r^{}\\[~\]|€]*$/;
function smsSegments(htmlOrText) {
    const plain = decodeHtml(String(htmlOrText).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));
    const gsm = GSM7.test(plain);
    const single = gsm ? 160 : 70;
    const multi = gsm ? 153 : 67;
    const chars = [...plain].length;
    const count = chars <= single ? 1 : Math.ceil(chars / multi);
    return { chars, count: Math.max(1, count), encoding: gsm ? 'GSM-7' : 'UCS-2' };
}

// ---------- Helpers ----------
function el(tag, className = '', text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function chip(text, tone) {
    const c = el('span', `chip${tone ? ` chip--${tone}` : ''}`, text);
    return c;
}

function svgIcon(id) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#${id}`);
    svg.appendChild(use);
    return svg;
}

function decodeHtml(html) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
}

function timeNow(withSeconds = false) {
    return new Date().toLocaleTimeString([], withSeconds
        ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
        : { hour: '2-digit', minute: '2-digit' });
}

function scrollToEnd(container) {
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
}

// Resolves after `ms`, or rejects if the simulation was restarted in the meantime
// so an in-flight relay stops touching the freshly reset UI.
function wait(ms) {
    const generation = sim.generation;
    return new Promise((resolve, reject) => setTimeout(() => {
        if (generation === sim.generation) return resolve();
        const error = new Error('Simulation restarted');
        error.name = 'RestartError';
        reject(error);
    }, ms));
}
