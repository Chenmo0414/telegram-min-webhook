# telegram-min-webhook

最小可用 Telegram Webhook 项目，支持两种运行方式：

1. **Cloudflare Worker（推荐）**
2. **Node.js + Express（本地/传统服务器）**

GitHub: https://github.com/Chenmo0414/telegram-min-webhook

---

## 目录

- `worker.js`：Cloudflare Worker 版本（可直接 CF 拉取）
- `wrangler.toml`：Worker 配置
- `index.js`：Node.js + Express 版本
- `.env.example`：本地环境变量示例

---

## A. Cloudflare Worker 部署（推荐）

### 1) 前置
- Cloudflare 账号
- 域名已在 Cloudflare 托管（如 `chenmo.space`）
- Node.js 18+

### 2) 安装与登录
```bash
pnpm install
npx wrangler login
```

### 3) 设置 Secrets
```bash
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET
```

### 4) 部署
```bash
pnpm deploy
```

部署成功后得到 Worker 域名，或绑定自定义路由（例如）：

- `tg.chenmo.space/telegram/webhook*`

### 5) 设置 Telegram Webhook
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://tg.chenmo.space/telegram/webhook" \
  -d "secret_token=<WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","edited_message"]'
```

### 6) 检查状态
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

---

## B. Node.js + Express 本地运行

```bash
pnpm install
copy .env.example .env
pnpm start
```

默认端点：
- `POST /telegram/webhook`
- `GET /health`

---

## 环境变量

### Worker
- `BOT_TOKEN`（secret）
- `WEBHOOK_SECRET`（secret）
- `PRIVATE_ONLY`（vars，默认 `true`）

### Node.js
```env
BOT_TOKEN=123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WEBHOOK_SECRET=replace_with_a_random_32_to_64_chars_secret
PORT=3000
PRIVATE_ONLY=true
```

---

## 脚本

```bash
pnpm start   # Node.js 版本
pnpm dev     # Wrangler 本地调试
pnpm deploy  # 部署 Cloudflare Worker
```

---

## License
MIT

## Worker 转发到 OpenClaw（可选）

如果你不希望 Worker 直接回声，而是把消息交给 OpenClaw 处理：

新增 Worker Variables/Secrets：

- `OPENCLAW_INGRESS_URL`：OpenClaw 可访问的 HTTP 入站地址（例如 hooks endpoint）
- `OPENCLAW_INGRESS_TOKEN`：对应 Bearer token（可选，但建议）
- `FORWARD_ONLY=true`：转发成功后不再回声（默认 true）

说明：
- 未配置 `OPENCLAW_INGRESS_URL` 时，Worker 继续使用回声逻辑。
- 配置后会先转发；若转发失败，会回落到回声（便于排障）。
