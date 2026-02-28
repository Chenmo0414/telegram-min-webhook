export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, runtime: 'cloudflare-worker' });
    }

    if (request.method === 'POST' && url.pathname === '/telegram/webhook') {
      const got = request.headers.get('x-telegram-bot-api-secret-token') || '';
      if (env.WEBHOOK_SECRET && got !== env.WEBHOOK_SECRET) {
        return new Response('invalid secret', { status: 401 });
      }

      const update = await request.json().catch(() => null);
      ctx.waitUntil(processUpdate(update, env));
      return new Response('OK', { status: 200 });
    }

    return new Response('not found', { status: 404 });
  },
};

async function processUpdate(update, env) {
  const msg = update?.message;
  if (!msg?.chat?.id || !msg?.text) return;

  const privateOnly = String(env.PRIVATE_ONLY ?? 'true').toLowerCase() === 'true';
  if (privateOnly && msg.chat.type !== 'private') return;

  const api = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: msg.chat.id,
    text: `你发的是：${String(msg.text).trim()}`,
  };

  const r = await fetch(api, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    console.error('sendMessage failed', r.status, t);
  }
}

function json(v, status = 200) {
  return new Response(JSON.stringify(v), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
