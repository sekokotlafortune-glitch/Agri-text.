# Agri text SMS relay simulator

A Node server with a multilingual weather and produce-price SMS bot, plus a browser simulation of the full relay:

```
Farm phone (2G) ──SMS──▶ Mobile network ──SMS──▶ Gateway smartphone (4G+) ──HTTPS──▶ Agri text AI ──▶ live APIs
   ◀──────────────────── reply SMS ◀───────────────────────────────┘                      (Open‑Meteo, Zippopotam)
```

The page shows the 2G farm phone (multi‑tap keypad), the gateway smartphone's relay app, a live architecture diagram that lights up at each hop (including which live APIs were called and their latency), and a timestamped relay timeline.

## API

- `POST /api/session` → `{ sessionId, state, lang, numericMenu }`
- `POST /api/message` `{ sessionId, text }` → `{ replies: [{ text, delayMs }], trace: [{ api, host, path, ms, status, ok }], … }`

`trace` lists the external calls made while answering (Open‑Meteo geocoding/forecast, Zippopotam postal codes).

## Run locally

```bash
npm start          # http://localhost:3000
npm run dev        # restarts on file changes
```

Requires Node 18+. No dependencies.

## Deploy to Render

The repo includes `render.yaml`, so you can create a **Blueprint** from it in the Render dashboard.

To set it up by hand instead, create a **Web Service** with:

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`

The server listens on Render's `PORT` on `0.0.0.0` and serves `public/` relative to `server.js`. No other configuration is needed.
