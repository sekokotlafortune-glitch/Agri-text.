'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const bot = require('./bot/engine');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_BODY_BYTES = 16 * 1024;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// In-memory session store: sessionId -> { data, lastSeen }
const sessions = new Map();

function getSession(sessionId) {
    const entry = sessionId && sessions.get(sessionId);
    if (!entry) return null;
    entry.lastSeen = Date.now();
    return entry.data;
}

function newSession() {
    const id = crypto.randomUUID();
    const data = bot.createSession();
    sessions.set(id, { data, lastSeen: Date.now() });
    return { id, data };
}

setInterval(() => {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [id, entry] of sessions) {
        if (entry.lastSeen < cutoff) sessions.delete(id);
    }
}, 60 * 1000).unref();

function sendJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store'
    });
    res.end(body);
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(Object.assign(new Error('Payload too large'), { status: 413 }));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            if (chunks.length === 0) return resolve({});
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
            } catch {
                reject(Object.assign(new Error('Invalid JSON body'), { status: 400 }));
            }
        });
        req.on('error', reject);
    });
}

function sessionView(id, data) {
    return {
        sessionId: id,
        state: data.state,
        lang: data.lang,
        numericMenu: bot.isNumericMenuState(data.state)
    };
}

async function handleApi(req, res, url) {
    if (req.method !== 'POST') {
        return sendJson(res, 405, { error: 'Method not allowed' });
    }

    // POST /api/session  -> start (or restart) a conversation
    if (url.pathname === '/api/session') {
        const { id, data } = newSession();
        return sendJson(res, 201, sessionView(id, data));
    }

    // POST /api/message  -> { sessionId, text } => { replies: [{ text, delayMs }], ... }
    if (url.pathname === '/api/message') {
        const body = await readJsonBody(req);
        const text = typeof body.text === 'string' ? body.text : '';
        if (!text.trim()) return sendJson(res, 400, { error: 'Message text is required' });

        let sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
        let session = getSession(sessionId);
        if (!session) {
            const created = newSession();
            sessionId = created.id;
            session = created.data;
        }

        const replies = await bot.processMessage(session, text);
        return sendJson(res, 200, { replies, ...sessionView(sessionId, session) });
    }

    return sendJson(res, 404, { error: 'Not found' });
}

function serveStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405).end();
        return;
    }

    const requestPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = path.normalize(path.join(PUBLIC_DIR, requestPath));
    if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
        res.writeHead(403).end();
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Content-Length': stats.size
        });
        if (req.method === 'HEAD') return res.end();
        fs.createReadStream(filePath).pipe(res);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    try {
        if (url.pathname.startsWith('/api/')) {
            await handleApi(req, res, url);
        } else {
            serveStatic(req, res, url);
        }
    } catch (error) {
        const status = error.status || 500;
        if (status >= 500) console.error('Request failed:', error);
        if (!res.headersSent) sendJson(res, status, { error: error.message || 'Internal server error' });
        else res.end();
    }
});

server.listen(PORT, HOST, () => {
    console.log(`Agri text server listening on http://localhost:${PORT}`);
});

module.exports = server;
