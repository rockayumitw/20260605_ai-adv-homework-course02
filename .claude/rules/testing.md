---
paths:
  - "tests/**"
---

# 測試規則

## 框架

Vitest 2 + Supertest。設定在 `vitest.config.js`。

## 輔助函式

從 `tests/setup.js` import，不要自行重複實作：

```javascript
const { app, request, getAdminToken, registerUser } = require('./setup');
```

| 函式 | 說明 |
|------|------|
| `request` | supertest 包裝的 app |
| `getAdminToken()` | 以種子管理員帳號登入，回傳 JWT string |
| `registerUser(overrides?)` | 建立新測試使用者，回傳 `{ token, user }` |

## 測試結構

```javascript
describe('Feature', () => {
  let token;
  beforeAll(async () => {
    const { token: t } = await registerUser();
    token = t;
  });
  it('should ...', async () => {
    const res = await request
      .post('/api/example')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'value' });
    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
  });
});
```

- 每個 `describe` 在 `beforeAll` 內取得 token，**不在 `it` 內重複登入**
- 驗證 `res.body.error` 是否為 `null`（成功）或特定錯誤碼（失敗）

## 執行順序（不可更動）

測試不可並行（`fileParallelism: false`），共用同一 SQLite，順序固定：

1. `tests/unit/shipping.test.js`
2. `tests/auth.test.js`
3. `tests/products.test.js`
4. `tests/cart.test.js`
5. `tests/orders.test.js`
6. `tests/adminProducts.test.js`
7. `tests/adminOrders.test.js`
8. `tests/ecpay.test.js`

**新增 unit 測試檔案必須加入 `vitest.config.js` 的 `include` 與 `sequence.files`**，並選擇適當插入位置（考量資料依賴關係）。Integration 測試放 `tests/integration/*.integration.test.js`（`vitest.integration.config.js`，記憶體 SQLite）。

## 常見陷阱

- 測試不做 `afterAll` cleanup，資料會殘留至下一個測試檔案
- 不要任意調換 `vitest.config.js` 中的測試順序
- 若需單獨跑一個測試：`npx vitest run --config vitest.config.js tests/cart.test.js`
