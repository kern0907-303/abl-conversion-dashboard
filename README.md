# ABL Conversion Dashboard

此專案是獨立的 ABL 轉換檢控面板，原始碼位於 repo 的 `abl-conversion-dashboard/` 子資料夾。

## 本地指令

```bash
npm install
npm test
npm run lint
npm run build
npm run dev
```

## 必要環境變數

Dashboard 前端、Netlify Functions 與追蹤 API 需要以下環境變數：

```bash
VITE_SUPABASE_URL=https://example.supabase.co
VITE_SUPABASE_ANON_KEY=replace-with-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key
DASHBOARD_ADMIN_EMAILS=admin@example.com
TRACKING_ALLOWED_ORIGINS=https://quantum-frequency-assessment.netlify.app,https://timewaver-audio-sales.netlify.app
```

`DASHBOARD_ADMIN_EMAILS` 是以逗號分隔的管理者 email allowlist。登入成功但不在 allowlist 的使用者無法讀取 dashboard summary。

## Netlify 部署設定

若從 monorepo 的 repo root 建立 Netlify site，請在 Netlify Site settings 將 Base directory 設為：

```text
abl-conversion-dashboard
```

子專案內的 `netlify.toml` 會在此 base directory 下生效，並使用：

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

## Supabase 設定

部署前先在 Supabase SQL editor 或 migration flow 套用：

```text
supabase/migrations/202606190001_create_analytics.sql
```

此 migration 會建立：

- `analytics_sites`
- `analytics_events`
- 事件查詢索引
- 兩個預設追蹤網站
- Row Level Security

目前資料寫入與 dashboard 讀取都透過 Netlify Functions 使用 service role key 執行；不要把 `SUPABASE_SERVICE_ROLE_KEY` 暴露到前端。

## 外部網站接入

兩個公開網站接入追蹤碼時，請依照：

```text
docs/external-site-integration.md
```

追蹤事件包含：

- `page_view`
- `assessment_submit`
- `audio_purchase_click`
- `line_click`
- `consultation_booking`
- `payment_success`

metadata 只允許商業分析必要欄位，例如按鈕 label、產品名稱、金額。前端 helper 與後端 ingest 都會過濾常見姓名、電話、email、卡號、密碼、token、地址、生日、護照、身分證等 private key。

## 已知非阻塞事項

`npm run build` 目前會因為 Recharts 產生 Vite chunk-size warning。這不影響第一版內部 dashboard 部署；若後續需要提升首次載入速度，可再把圖表元件改成 dynamic import 或調整 bundle splitting。
