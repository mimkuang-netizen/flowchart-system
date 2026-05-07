# IG polling — 為什麼 + 怎麼用

## 為什麼有這支

Meta 的限制：
- App 在 **Live mode** 才會把 IG DM / 留言 推到 webhook
- App Review 影片**必須**先拍出「客戶發訊息→後台收到」才能送審
- 所以陷入死循環：要送審才能 Live，要 Live 才能收訊息

解法：**用 Graph API 主動 polling**，繞開 webhook。  
路徑：`POST /api/cron/ig-poll`（其實是 GET，但語意上是「拉一次」）  
實作檔：`app/api/cron/ig-poll/route.js`

---

## 環境變數（要在 Vercel 設）

| 變數 | 說明 | 既有/新增 |
|------|------|----------|
| `META_PAGE_ACCESS_TOKEN` | FB Page 長期 token（含 IG 權限） | 既有 |
| `IG_USER_ID` | IG 商業帳號 user id：**17841451805980193** | 🆕 新增 |
| `CRON_SECRET` | 自訂隨機字串（至少 32 字元） | 🆕 新增 |

設定 `CRON_SECRET` 的方法（Mac）：

```bash
# 產生 32 字元隨機 secret
openssl rand -hex 32
```

把產出的字串貼到 Vercel：Settings → Environment Variables → 加 `CRON_SECRET`

---

## 怎麼測試

### 1. 本地開發（如果有 token）

把上面三個變數加到 `.env.local`，然後：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3004/api/cron/ig-poll
```

### 2. Vercel 部署後

```bash
curl -H "Authorization: Bearer 你的CRON_SECRET" https://flowchart-system.vercel.app/api/cron/ig-poll
```

回應範例：

```json
{
  "ok": true,
  "messages": { "received": 3, "written": 1, "deduped": 2, "errors": [] },
  "comments": { "received": 5, "written": 2, "deduped": 3, "errors": [] }
}
```

---

## 拍 Meta App Review 影片用

拍片流程：

1. **拍片前**：先 curl 一次確認能拉訊息 ✅
2. **手機操作**（ky__0803 → @mim_master_mirror）：
   - 發 IG Direct「請問這款多少錢？」
   - 在貼文留言「還有貨嗎？」
3. **電腦操作**：
   - 開 mim-website /admin/inquiries
   - 重新整理 → **此時 polling 才會跑**
   - **注意**：mim-website triage UI 目前沒整合 polling，要先 curl 一次或等下個 cron tick
4. **建議**：拍片時準備兩個終端機分頁
   - 一個跑 mim-website 的 admin 後台
   - 一個跑 `watch -n 5 'curl -H "Authorization: Bearer ..." https://flowchart-system.vercel.app/api/cron/ig-poll'`（每 5 秒戳一次）
   - 這樣手機發完訊息，最多 5 秒內後台就看得到

---

## 自動化 polling（拍完片後再做也不遲）

### 選項 A：Vercel Cron（要 Pro plan）

把 `vercel.json` 改成：

```json
{
  "crons": [
    { "path": "/api/cron/ig-poll", "schedule": "*/1 * * * *" }
  ]
}
```

Vercel 會自動帶 `Authorization: Bearer $CRON_SECRET` header。

⚠️ **Hobby plan 限制**：每天只能跑 1 次。等於沒用。

### 選項 B：免費 cron-job.org

1. 註冊 https://cron-job.org
2. 新增 cron job：
   - URL: `https://flowchart-system.vercel.app/api/cron/ig-poll`
   - 頻率：1 分鐘
   - Header: `Authorization: Bearer 你的CRON_SECRET`
3. 啟用

### 選項 C：Supabase pg_cron

如果嫌 cron-job.org 多一層依賴，可以用 Supabase 內建的 pg_cron：

```sql
SELECT cron.schedule(
  'ig-poll',
  '* * * * *',
  $$SELECT net.http_get(
    url := 'https://flowchart-system.vercel.app/api/cron/ig-poll',
    headers := jsonb_build_object('Authorization', 'Bearer ...')
  )$$
);
```

---

## 寫入到哪

`mim-website` Supabase 的 `quick_inquiry` 表，用 `sourceMessageId` 去重：

| source 值 | 來源 |
|----------|------|
| `INSTAGRAM` | IG Direct messages |
| `INSTAGRAM_COMMENT` | IG 貼文留言 |

mim-website /admin/inquiries triage UI 已經會顯示 `INSTAGRAM`，新增的 `INSTAGRAM_COMMENT` 是新 source value，要看 triage UI 的篩選器有沒有處理；如果沒有，會以「未知 source」呈現但仍可看見。

---

## App Live 之後怎麼辦

App 通過 Review 升 Live mode 後：
- Webhook 會自動恢復推送 IG 訊息
- Polling 還是可以跑（雙保險，dedup 會自動跳過重複的）
- 也可以把 polling cron 關掉

---

## 既知缺陷 / 可改善處

1. **沒有「上次 polling 時間」狀態追蹤** — 每次都拉最近 25 個 conversation × 20 則訊息，靠 dedup 過濾。OK for MVP，但量大會浪費 Graph API quota
2. **沒有 attachments 處理** — 圖片 / 影片訊息只存文字摘要，不存 URL（webhook 版有處理）
3. **沒有錯誤通知** — Graph API token 過期 / quota 滿時，只會寫進 response body 的 errors 陣列，沒有主動通知客服

這三點等送審通過後再補。
