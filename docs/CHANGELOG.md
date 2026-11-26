# Changelog

## [Unreleased]

### Added
- 配送費用模組 `src/utils/shipping.js`（宅配 120／超商 60／滿 1,500 免基本運費／偏遠 +200／當日急件 +250）
- `POST /api/shipping/quote` 運費試算端點
- `POST /api/orders` 支援 `shippingMethod`、`isRemote`、`isSameDay`，回傳 `subtotal`、`shipping_fee`；`total_amount = subtotal + shipping_fee`
- `orders` 表新增 `subtotal`、`shipping_method`、`shipping_fee`、`is_remote`、`is_same_day`（舊資料庫啟動時自動 ALTER 補欄位）
- 結帳頁配送方式／偏遠／急件選項；訂單詳情頁顯示運費
- 環境變數 `DATABASE_PATH`（指定 SQLite 檔或 `:memory:`）
- Unit Test（`tests/unit/shipping.test.js`）、Integration Test（`tests/integration/`，記憶體 SQLite）
- `npm run test:unit`、`npm run test:integration`、`npm run postman`；`scripts/generate-postman.js`
- GitHub Actions：`.github/workflows/test.yml`（unit + integration）

### Changed
- 原有測試改用暫存 SQLite 並由 vitest 設定注入測試環境變數，不再寫入 `database.sqlite`、不需 `.env`
- E2E 改用已啟動的 `localhost:3001`（移除 `webServer`），預設 headless；流程對齊作業（含配送、網路 ATM、返回商店、驗證 paid）
- 購物車頁不再顯示寫死的運費（改為結帳時計算）
- `tests/ecpay.test.js` 的 `ChoosePayment` 斷言更新為 `ALL`（與現行實作一致）

### Removed
- 不再追蹤 `test-results/` 與 Playwright 產物（改列入 `.gitignore`）

## [1.2.0] — 2026-06-07

### Added
- Playwright E2E 測試套件（`tests/e2e/`）
- `playwright.config.js`：錄影（video: on）、截圖、trace 全開
- `tests/e2e/checkout-ecpay.spec.js`：完整購物結帳流程（登入 → 加購物車 → 結帳 → 綠界 ATM 網路交易 → MockATM 完成）
- `npm run test:e2e`、`npm run test:e2e:ui` 指令
- `.env.example` 環境變數範例檔
- `server.js` 獨立 HTTP server 入口（原 app.js 分離）

### Changed
- 全站 UI 重構：以 CSS custom properties + inline style 取代 Tailwind class，設計一致性提升
- 首頁商品卡片、購物車、結帳、訂單列表、訂單詳情頁全面重新設計
- Header 動態渲染邏輯優化（`public/js/header-init.js`）
- 訂單列表頁（`orders.js`）分頁與狀態篩選改善

## [1.1.0] — 2026-05-26

### Added
- 綠界 ECPay AIO 金流串接（信用卡，測試環境）
- `POST /api/orders/:id/ecpay-checkout`：產生 CheckMacValue 付款參數，回傳給前端動態 form submit
- `POST /api/orders/:id/verify-ecpay`：主動呼叫 QueryTradeInfo/V5 API 驗證付款結果
- `POST /api/ecpay/order-result`：綠界付款後瀏覽器導回處理（302 redirect 觸發前端驗證）
- `POST /api/ecpay/notify`：綠界 Server-to-Server 通知端點（本地環境備用）
- `src/services/ecpayService.js`：封裝 CheckMacValue 計算、QueryTradeInfo 查詢
- orders 表新增 `ecpay_merchant_trade_no` 欄位
- ECPay 整合測試（`tests/ecpay.test.js`，13 個測試案例）

### Changed
- 訂單詳情頁移除付款模擬按鈕，改為「前往綠界付款」按鈕

## [1.0.0] — 2026-05-25

### Added
- 使用者認證：註冊、登入、個人資料（JWT HS256）
- 商品列表與詳情（分頁）
- 購物車（雙模式認證：JWT + session）
- 訂單建立（transaction：建立訂單、扣庫存、清購物車）
- 付款模擬（success/fail）
- 管理員後台：商品 CRUD
- 管理員後台：訂單管理
- EJS 前台頁面（首頁、商品詳情、購物車、結帳、訂單）
- EJS 後台頁面（商品管理、訂單管理）
- OpenAPI/Swagger 文件
- Vitest 測試套件（6 個測試檔案）
- AI 輔助開發文件結構（CLAUDE.md、docs/、rules、hooks、agents）
