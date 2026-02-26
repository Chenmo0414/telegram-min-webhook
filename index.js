import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const PRIVATE_ONLY = (process.env.PRIVATE_ONLY || 'true').toLowerCase() === 'true';

if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN in environment variables.');
  process.exit(1);
}

function secureCompare(a, b) {
  const aBuf = Buffer.from(a || '');
  const bBuf = Buffer.from(b || '');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

async function sendMessage(chatId, text) {
  const resp = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
    signal: AbortSignal.timeout(8000)
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.ok) {
    throw new Error(`sendMessage failed: ${resp.status} ${JSON.stringify(data)}`);
  }
}

async function processUpdate(update) {
  const msg = update?.message;
  if (!msg?.chat?.id || !msg?.text) return;

  if (PRIVATE_ONLY && msg.chat.type !== 'private') {
    return;
  }

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  await sendMessage(chatId, `你发的是：${text}`);
}

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, uptimeSec: Math.floor(process.uptime()) });
});

app.post('/telegram/webhook', (req, res) => {
  if (WEBHOOK_SECRET) {
    const got = req.get('X-Telegram-Bot-Api-Secret-Token') || '';
    if (!secureCompare(got, WEBHOOK_SECRET)) {
      return res.status(401).send('invalid secret');
    }
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
  console.log(`Webhook server listening on http://localhost:${PORT}`);
  console.log('Endpoint: POST /telegram/webhook');
  console.log(`PRIVATE_ONLY=${PRIVATE_ONLY}`);
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
