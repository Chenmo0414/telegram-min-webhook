# telegram-min-webhook

鐢熶骇鍙敤 Telegram Webhook 涓浆鏈嶅姟锛圢ode.js + Express锛夛紝鏀寔锛?
- Telegram Webhook 楠岀锛坄secret_token`锛?- 蹇€?`200 ACK` + 寮傛澶勭悊
- 杞彂鍒?OpenClaw hooks锛堟帹鑽愶級
- 鍙€夊洖澹板厹搴?- 鍘婚噸锛坄update_id`锛変笌鍩虹瀹夊叏鎺у埗

---

## 鎺ㄨ崘鏋舵瀯锛堝浗鍐呬簯鏈嶅姟鍣級

`Telegram -> Cloudflare -> Nginx(443) -> telegram-min-webhook(127.0.0.1:13000) -> OpenClaw hooks`

- Cloudflare 璐熻矗鍏綉鎺ュ叆鍜?TLS 杈圭紭鑳藉姏
- Nginx 璐熻矗鍙嶅悜浠ｇ悊涓庤矾寰勬敹鏁?- Node 鏈嶅姟鍙洃鍚湰鍦扮幆鍥炲湴鍧€
- OpenClaw 涓撴敞涓氬姟澶勭悊

---

## 鐜鍙橀噺

鍙傝€?`.env.example`锛?
- `BOT_TOKEN`锛歍elegram Bot Token
- `WEBHOOK_SECRET`锛氫笌 `setWebhook secret_token` 涓€鑷?- `PORT`锛氭湰鍦扮洃鍚鍙ｏ紙渚嬪 13000锛?- `PRIVATE_ONLY`锛氭槸鍚︿粎澶勭悊绉佽亰
- `OPENCLAW_HOOKS_URL`锛歄penClaw `/hooks/agent` 鍦板潃
- `OPENCLAW_HOOKS_TOKEN`锛歄penClaw hooks token
- `FORWARD_ONLY=true`锛氳浆鍙戞垚鍔熷悗涓嶈蛋鍥炲０
- `ALLOW_IPS`锛氬彲閫夛紝鏉ユ簮 IP 鐧藉悕鍗曪紙閫楀彿鍒嗛殧锛?
---

## 鏈湴鍚姩

```bash
pnpm install
cp .env.example .env
pnpm start
```

鍋ュ悍妫€鏌ワ細

```bash
curl http://127.0.0.1:13000/health
```

---

## Nginx 鍙嶄唬閮ㄧ讲锛圠inux锛?
1. 澶嶅埗閰嶇疆锛歚deploy/nginx.tg-webhook.conf` 鍒?`/etc/nginx/conf.d/`
2. 鎸夊疄闄呰瘉涔﹁矾寰勬敼 `ssl_certificate` / `ssl_certificate_key`
3. 妫€鏌ュ苟閲嶈浇锛?
```bash
nginx -t && systemctl reload nginx
```

---

## systemd 瀹堟姢

1. 澶嶅埗 `deploy/telegram-min-webhook.service` 鍒?`/etc/systemd/system/`
2. 椤圭洰鏀惧湪 `/opt/telegram-min-webhook`
3. 鍚姩锛?
```bash
systemctl daemon-reload
systemctl enable telegram-min-webhook
systemctl restart telegram-min-webhook
systemctl status telegram-min-webhook
```

---

## 璁剧疆 Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://tg.chenmo.space/telegram/webhook" \
  -d "secret_token=<WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","edited_message"]'
```

楠岃瘉锛?
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

鏈熸湜锛?- `url` 涓轰綘鐨勫煙鍚?- `last_error_message` 涓虹┖
- `pending_update_count` 涓嶆寔缁闀?
---

## OpenClaw hooks 鏈€灏忛厤缃ず渚?
```json
{
  "hooks": {
    "enabled": true,
    "token": "replace_with_token",
    "path": "/hooks"
  }
}
```

Worker/涓浆鏈嶅姟杞彂鐩爣濉細

`https://<your-openclaw-host>/hooks/agent`

---

## License

MIT
---

## Docker 一键部署（国内服务器推荐）

### 1) GitHub Actions 自动构建镜像

已内置工作流：`.github/workflows/docker-build.yml`

- 推送 `main` 自动构建并推送到 GHCR
- 镜像地址：`ghcr.io/chenmo0414/telegram-min-webhook:latest`

> 首次使用 GHCR 私有镜像时，服务器需先 `docker login ghcr.io`。

### 2) 服务器一键拉起

在服务器执行：

```bash
mkdir -p /opt/telegram-min-webhook
cd /opt/telegram-min-webhook

# 写入你的 .env（参考仓库 .env.example）
vim .env

# 下载部署脚本并执行
curl -fsSL https://raw.githubusercontent.com/Chenmo0414/telegram-min-webhook/main/deploy/docker-deploy.sh -o docker-deploy.sh
chmod +x docker-deploy.sh
./docker-deploy.sh
```

### 3) Nginx 反代

继续使用 `deploy/nginx.tg-webhook.conf`，把上游指向：

`127.0.0.1:13000`

容器只监听本机回环端口，不暴露公网端口，安全性更好。
