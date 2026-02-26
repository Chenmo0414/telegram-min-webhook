# telegram-min-webhook

一个最小可用的 Telegram Bot Webhook 示例（Node.js + Express）。

A minimal, production-friendly Telegram Bot webhook starter using Node.js + Express.

---

## 中文说明

### 功能特性
- 使用 Telegram Webhook 接收消息
- 支持 `secret_token` 请求头校验
- 默认仅处理私聊消息（`PRIVATE_ONLY=true`）
- 快速返回 `200 OK`，异步处理消息，降低重试风险
- 提供健康检查接口：`GET /health`

### 项目结构
- `index.js`：Webhook 服务主程序
- `.env.example`：环境变量示例
- `.gitignore`：忽略敏感文件（如 `.env`）

### 环境要求
- Node.js 18+
- pnpm 10+

### 安装与运行
```bash
pnpm install
cp .env.example .env
pnpm start
```

Windows PowerShell 可用：
```powershell
copy .env.example .env
pnpm start
```

### 环境变量
```env
BOT_TOKEN=123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WEBHOOK_SECRET=replace_with_a_random_32_to_64_chars_secret
PORT=3000
PRIVATE_ONLY=true
```

> `BOT_TOKEN` 来自 `@BotFather`。  
> `WEBHOOK_SECRET` 由你自己生成随机字符串，并在 `setWebhook` 时用同一个值传给 `secret_token`。

### 设置 Webhook
将你的公网 HTTPS 地址替换为实际值（例如 Cloudflare Tunnel / ngrok）：

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://your-domain/telegram/webhook" \
  -d "secret_token=<WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","edited_message"]'
```

### 查看 Webhook 状态
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

---

## English

### Features
- Receives updates via Telegram Webhook
- Optional `secret_token` header verification
- Private chat only by default (`PRIVATE_ONLY=true`)
- Fast `200 OK` response with async processing to reduce retries
- Health check endpoint: `GET /health`

### Structure
- `index.js`: main webhook server
- `.env.example`: environment template
- `.gitignore`: excludes sensitive files like `.env`

### Requirements
- Node.js 18+
- pnpm 10+

### Install & Run
```bash
pnpm install
cp .env.example .env
pnpm start
```

### Environment Variables
```env
BOT_TOKEN=123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WEBHOOK_SECRET=replace_with_a_random_32_to_64_chars_secret
PORT=3000
PRIVATE_ONLY=true
```

> `BOT_TOKEN` is issued by `@BotFather`.  
> `WEBHOOK_SECRET` is self-generated and must match `secret_token` in `setWebhook`.

### Set Webhook
Replace with your real HTTPS endpoint (Cloudflare Tunnel / ngrok):

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://your-domain/telegram/webhook" \
  -d "secret_token=<WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","edited_message"]'
```

### Check Webhook Status
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

---
