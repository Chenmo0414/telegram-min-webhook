# telegram-min-webhook

生产可用的 Telegram Webhook 中转服务（Node.js + Express），适用于：

- 国内云服务器 + Nginx 反代
- Cloudflare 转发到 `tg.chenmo.space`
- 下游转发到 OpenClaw `/hooks/agent`

## 功能特性

- Telegram `secret_token` 校验
- Webhook 快速 `200 ACK`，异步处理消息
- `update_id` 去重，降低重试重复处理风险
- 支持转发到 OpenClaw（推荐）
- 转发失败可回退 echo（可关闭）
- `health/ready` 健康检查

---

## 架构（推荐）

`Telegram -> Cloudflare -> Nginx(443) -> telegram-min-webhook(127.0.0.1:13000) -> OpenClaw hooks`

说明：

- Cloudflare：公网入口、证书与转发
- Nginx：反向代理与路径收敛
- 本服务：Webhook 验签 + 转发
- OpenClaw：智能处理与回复

---

## 环境变量

参考 `.env.example`：

- `BOT_TOKEN`：Telegram Bot Token
- `WEBHOOK_SECRET`：与 `setWebhook secret_token` 一致
- `PORT`：服务监听端口（容器内默认 3000）
- `PRIVATE_ONLY`：是否仅处理私聊（默认 `true`）
- `OPENCLAW_HOOKS_URL`：OpenClaw `/hooks/agent` 地址
- `OPENCLAW_HOOKS_TOKEN`：OpenClaw hooks token
- `FORWARD_ONLY`：转发成功后是否不再执行回声（默认 `true`）
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
curl http://127.0.0.1:3000/health
```

---

## Docker 部署（推荐）

仓库已包含：

- `Dockerfile`
- `docker-compose.yml`
- `deploy/docker-deploy.sh`
- GitHub Actions：`.github/workflows/docker-build.yml`

### GitHub Actions 自动构建镜像

推送到 `main` 后自动构建并推送到 GHCR：

- `ghcr.io/chenmo0414/telegram-min-webhook:latest`

### 服务器一键拉起

```bash
mkdir -p /opt/telegram-min-webhook
cd /opt/telegram-min-webhook

# 创建 .env（按项目 .env.example 填写）
vim .env

curl -fsSL https://raw.githubusercontent.com/Chenmo0414/telegram-min-webhook/main/deploy/docker-deploy.sh -o docker-deploy.sh
chmod +x docker-deploy.sh
./docker-deploy.sh
```

容器对外仅绑定本机：

- `127.0.0.1:13000 -> container:3000`

---

## Nginx 反代

使用 `deploy/nginx.tg-webhook.conf`，核心目标：

- `location = /telegram/webhook` -> `http://127.0.0.1:13000/telegram/webhook`

重载：

```bash
nginx -t && systemctl reload nginx
```

---

## 设置 Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://tg.chenmo.space/telegram/webhook" \
  -d "secret_token=<WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","edited_message"]'
```

查询状态：

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

通过标准：

- `url` 正确
- `last_error_message` 为空
- `pending_update_count` 不持续增长

---

## OpenClaw hooks 最小配置

```json
{
  "hooks": {
    "enabled": true,
    "token": "replace_with_token",
    "path": "/hooks"
  }
}
```

并将本服务配置为：

- `OPENCLAW_HOOKS_URL=https://<openclaw-host>/hooks/agent`
- `OPENCLAW_HOOKS_TOKEN=<same-token>`

---

## License

MIT