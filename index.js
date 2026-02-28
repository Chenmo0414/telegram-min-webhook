import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const PRIVATE_ONLY = (process.env.PRIVATE_ONLY || 'true').toLowerCase() === 'true';

// OpenClaw forwarding (recommended in production)
const OPENCLAW_HOOKS_URL = process.env.OPENCLAW_HOOKS_URL || '';
const OPENCLAW_HOOKS_TOKEN = process.env.OPENCLAW_HOOKS_TOKEN || '';
const FORWARD_ONLY = (process.env.FORWARD_ONLY || 'true').toLowerCase() === 'true';

// Optional IP allow list (comma-separated). Useful when directly exposed.
const ALLOW_IPS = (process.env.ALLOW_IPS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Deduplicate update_id for a short window to avoid repeated processing.
const seen = new Map();
const SEEN_TTL_MS = 10 * 60 * 1000;
const SEEN_MAX = 3000;

if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN in environment variables.');
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

function secureCompare(a, b) {
  const aBuf = Buffer.from(a || '');
  const bBuf = Buffer.from(b || '');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function clientIp(req) {
  return (
    req.get('cf-connecting-ip') ||
    req.get('x-real-ip') ||
    req.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    ''
  );
}

function isAllowedIp(ip) {
  if (!ALLOW_IPS.length) return true;
  return ALLOW_IPS.includes(ip);
}

function markSeen(updateId) {
  const now = Date.now();
  seen.set(updateId, now);

  // cleanup stale
  for (const [k, t] of seen) {
    if (now - t > SEEN_TTL_MS) seen.delete(k);
  }

  // cap size
  if (seen.size > SEEN_MAX) {
    const first = seen.keys().next().value;
    if (first !== undefined) seen.delete(first);
  }
}

function hasSeen(updateId) {
  const t = seen.get(updateId);
  if (!t) return false;
  if (Date.now() - t > SEEN_TTL_MS) {
    seen.delete(updateId);
    return false;
  }
  return true;
}

async function sendMessage(chatId, text) {
  const resp = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
    signal: AbortSignal.timeout(10000)
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.ok) {
    throw new Error(`sendMessage failed: ${resp.status} ${JSON.stringify(data)}`);
  }
}

async function forwardToOpenClaw(msg) {
  if (!OPENCLAW_HOOKS_URL) return false;

  const payload = {
    message: String(msg.text || '').trim(),
    name: 'telegram-webhook',
    deliver: true,
    channel: 'telegram',
    to: String(msg.chat.id),
    wakeMode: 'now'
  };

  const headers = { 'content-type': 'application/json' };
  if (OPENCLAW_HOOKS_TOKEN) {
    headers.authorization = `Bearer ${OPENCLAW_HOOKS_TOKEN}`;
  }

  const resp = await fetch(OPENCLAW_HOOKS_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000)
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`forward failed: ${resp.status} ${text}`);
  }

  return true;
}

async function processUpdate(update) {
  const msg = update?.message;
  if (!msg?.chat?.id || !msg?.text) return;

  if (PRIVATE_ONLY && msg.chat.type !== 'private') return;

  // Preferred: hand off to OpenClaw
  if (OPENCLAW_HOOKS_URL) {
    try {
      const ok = await forwardToOpenClaw(msg);
      if (ok && FORWARD_ONLY) return;
    } catch (err) {
      console.error('forwardToOpenClaw error:', err.message || err);
    }
  }

  // Fallback behavior
  await sendMessage(msg.chat.id, `你发的是：${String(msg.text).trim()}`);
}

app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    uptimeSec: Math.floor(process.uptime()),
    mode: OPENCLAW_HOOKS_URL ? 'forward' : 'echo'
  });
});

app.get('/ready', (req, res) => {
  res.status(200).json({ ok: true });
});

app.post('/telegram/webhook', (req, res) => {
  const ip = clientIp(req);
  if (!isAllowedIp(ip)) {
    return res.status(403).send('forbidden ip');
  }

  if (WEBHOOK_SECRET) {
    const got = req.get('X-Telegram-Bot-Api-Secret-Token') || '';
    if (!secureCompare(got, WEBHOOK_SECRET)) {
      return res.status(401).send('invalid secret');
    }
  }

  const updateId = req.body?.update_id;
  if (typeof updateId === 'number') {
    if (hasSeen(updateId)) {
      return res.sendStatus(200);
    }
    markSeen(updateId);
  }

  // ACK first to avoid Telegram retries due to slow downstream work.
  res.sendStatus(200);

  processUpdate(req.body).catch((err) => {
    console.error('Webhook processUpdate error:', err.message || err);
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled express error:', err?.message || err);
  if (!res.headersSent) res.status(500).json({ ok: false });
});

const server = app.listen(PORT, () => {
  console.log(`Webhook server listening on http://127.0.0.1:${PORT}`);
  console.log('Endpoint: POST /telegram/webhook');
  console.log(`PRIVATE_ONLY=${PRIVATE_ONLY}`);
  console.log(`FORWARD_ONLY=${FORWARD_ONLY}`);
  console.log(`OPENCLAW_HOOKS_URL=${OPENCLAW_HOOKS_URL ? 'configured' : 'not set'}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));