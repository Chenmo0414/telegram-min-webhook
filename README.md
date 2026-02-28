# telegram-min-webhook

生产可用 Telegram Webhook 中转服务（Node.js + Express），支持：

- Telegram Webhook 验签（`secret_token`）
- 快速 `200 ACK` + 异步处理
- 转发到 OpenClaw hooks（推荐）
- 可选回声兜底
- 去重（`update_id`）与基础安全控制

---

## 推荐架构（国内云服务器）

`Telegram -> Cloudflare -> Nginx(443) -> telegram-min-webhook(127.0.0.1:13000) -> OpenClaw hooks`

- Cloudflare 负责公网接入和 TLS 边缘能力
- Nginx 负责反向代理与路径收敛
- Node 服务只监听本地环回地址
- OpenClaw 专注业务处理

---

## 环境变量

参考 `.env.example`：

- `BOT_TOKEN`：Telegram Bot Token
- `WEBHOOK_SECRET`：与 `setWebhook secret_token` 一致
- `PORT`：本地监听端口（例如 13000）
- `PRIVATE_ONLY`：是否仅处理私聊
- `OPENCLAW_HOOKS_URL`：OpenClaw `/hooks/agent` 地址
- `OPENCLAW_HOOKS_TOKEN`：OpenClaw hooks token
- `FORWARD_ONLY=true`：转发成功后不走回声
- `ALLOW_IPS`：可选，来源 IP 白名单（逗号分隔）

---

## 本地启动

```bash
pnpm install
cp .env.example .env
pnpm start
```

健康检查：

```bash
curl http://127.0.0.1:13000/health
```

---

## Nginx 反代部署（Linux）

1. 复制配置：`deploy/nginx.tg-webhook.conf` 到 `/etc/nginx/conf.d/`
2. 按实际证书路径改 `ssl_certificate` / `ssl_certificate_key`
3. 检查并重载：

```bash
nginx -t && systemctl reload nginx
```

---

## systemd 守护

1. 复制 `deploy/telegram-min-webhook.service` 到 `/etc/systemd/system/`
2. 项目放在 `/opt/telegram-min-webhook`
3. 启动：

```bash
systemctl daemon-reload
systemctl enable telegram-min-webhook
systemctl restart telegram-min-webhook
systemctl status telegram-min-webhook
```

---

## 设置 Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://tg.chenmo.space/telegram/webhook" \
  -d "secret_token=<WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","edited_message"]'
```

验证：

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

期望：
- `url` 为你的域名
- `last_error_message` 为空
- `pending_update_count` 不持续增长

---

## OpenClaw hooks 最小配置示例

```json
{
  "hooks": {
    "enabled": true,
    "token": "replace_with_token",
    "path": "/hooks"
  }
}
```

Worker/中转服务转发目标填：

`https://<your-openclaw-host>/hooks/agent`

---

## License

MIT