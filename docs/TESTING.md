# 測試規範

## 測試框架

**Vitest 2 + Supertest**，設定在 `vitest.config.js`。

## 測試分層與指令

| 指令 | 範圍 | 資料庫 |
|------|------|--------|
| `npm run test:unit` | Shipping 單元測試 + 原有 API 測試 | 暫存 SQLite（`tests/.tmp/unit.sqlite`，每次執行前重建） |
| `npm run test:integration` | 訂單建立流程（`tests/integration/`） | 記憶體 SQLite（`:memory:`） |
| `npm run test:e2e` | Playwright E2E（`tests/e2e/`） | 使用已啟動的 `http://localhost:3001`（其資料庫） |
| `npm run postman` | 產生最新 `openapi.json` 與 Postman Collection（`postman/`，不 commit） | — |
| `npm test` | unit + integration | — |

三種自動測試都**不會動到專案的 `database.sqlite`**。測試用環境變數（`JWT_SECRET`、`ECPAY_*`、`DATABASE_PATH`）由 `vitest.config.js` / `vitest.integration.config.js` 注入，不需要 `.env`。

## Unit 測試檔案與執行順序

測試**不可並行**（`fileParallelism: false`），因為共用同一個暫存 SQLite，執行順序固定如下：

| 順序 | 檔案 | 涵蓋功能 |
|------|------|---------|
| 1 | `tests/unit/shipping.test.js` | 運費計算（宅配、超商、1,499／1,500、偏遠、急件、組合） |
| 2 | `tests/auth.test.js` | 註冊、登入、個人資料 |
| 3 | `tests/products.test.js` | 商品列表、詳情 |
| 4 | `tests/cart.test.js` | 購物車 CRUD（JWT + session） |
| 5 | `tests/orders.test.js` | 建立訂單、列表、詳情、付款模擬 |
| 6 | `tests/adminProducts.test.js` | 管理員商品 CRUD |
| 7 | `tests/adminOrders.test.js` | 管理員訂單查看/更新 |
| 8 | `tests/ecpay.test.js` | ECPay 金流 |

## Integration 測試

`tests/integration/order-flow.integration.test.js`：建立會員 → 取得商品 → 加入購物車 → 建立訂單，驗證狀態碼與格式、orders／order_items 寫入、運費與總額、庫存扣除、購物車清空；失敗情境（配送參數不合法、空購物車、庫存不足、transaction 中途失敗）驗證不留下不完整訂單、庫存不變。

## E2E 測試

`tests/e2e/checkout-ecpay.spec.js`：登入 → 加入購物車 → 結帳（選超商取貨＋偏遠）→ 建立訂單 → 綠界「網路 ATM」「台灣土地銀行」→ Save → 返回商店 → 驗證「已付款」與 API `status = paid`，並於付款成功返回後截圖。

- 需先啟動專案，E2E 不會自己啟動伺服器：先 `npm run css:build`（產生被 `.gitignore` 的 `public/css/output.css`），再 `npm run dev:server`（需 `.env` 的 `JWT_SECRET` 與 `ECPAY_*`），或直接 `npm start`。
- 頁面的 Vue 由 `unpkg.com` 載入，瀏覽器必須能連外網；沒載入時畫面會停在 `{{ }}` 樣板，登入步驟會逾時。
- 綠界付款成功後會自動導回商店（`OrderResultURL`）；若停在結果頁出現「返回商店」按鈕，腳本會點擊它。
- 付款後伺服器會呼叫綠界 `QueryTradeInfo` 驗證，因此執行伺服器的機器也要能連到 `payment-stage.ecpay.com.tw`。
- 預設 headless；要看畫面：`HEADED=1 npm run test:e2e`。
- 首次使用需安裝瀏覽器與系統函式庫：`npx playwright install chromium`（Linux 另需 `sudo npx playwright install-deps chromium`）。
- 需連線到綠界測試環境（`payment-stage.ecpay.com.tw`）。
- 報告、截圖、影片、trace 都在 `test-results/`（已加入 `.gitignore`，不 commit）。

## CI（GitHub Actions）

`.github/workflows/test.yml` 在 push / pull_request 時依序執行 `npm run test:unit`、`npm run test:integration`；不跑 E2E、不啟動額外服務。

## 執行測試

```bash
npm test                 # unit + integration
npm run test:unit
npm run test:integration
```

單獨跑某個檔案請指定 config：

```bash
npx vitest run --config vitest.config.js tests/cart.test.js
```

## 測試輔助函式（tests/setup.js）

```javascript
const { app, request, getAdminToken, registerUser } = require('./setup');
```

| 函式 | 說明 |
|------|------|
| `app` | Express app 實例 |
| `request` | supertest 包裝的 app，可直接呼叫 `.get/.post...` |
| `getAdminToken()` | 以種子管理員帳號登入，回傳 JWT token string |
| `registerUser(overrides)` | 建立新測試使用者，回傳 `{ token, user }`。可傳 `{ email, password, name }` 覆蓋預設值 |

## 撰寫新測試

```javascript
const { request, getAdminToken, registerUser } = require('./setup');

describe('Feature Name', () => {
  let token;

  beforeAll(async () => {
    const { token: t } = await registerUser();
    token = t;
  });

  it('should do something', async () => {
    const res = await request
      .post('/api/example')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'value' });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toBeDefined();
  });
});
```

## 已知陷阱

**bcrypt rounds 差異**：`src/database.js` 的 `seedAdminUser()` 在 `NODE_ENV=test` 時使用 rounds=1（加速測試），生產環境使用 rounds=10。Vitest 執行時 `NODE_ENV` 會被設為 `test`，因此如果手動啟動 server 後 DB 裡的 admin 密碼是以 rounds=10 雜湊的，用測試跑出的 token 不會有問題，但若刪除 DB 重建、且環境不是 test，種子密碼雜湊會不同（仍可登入，只是速度差異）。

**DB 狀態殘留**：測試不會在測試結束後清除資料（無 `afterAll` cleanup），因此測試之間若有資料相依性，執行順序至關重要。不要任意調換 `vitest.config.js` 中的 `sequence.files` 順序。
