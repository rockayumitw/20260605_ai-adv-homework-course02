---
paths:
  - "src/routes/**"
---

# API 設計規則

## 統一回應格式

所有 API 回應必須使用以下固定結構：

```json
{ "data": ..., "error": null, "message": "繁體中文說明" }
```

- `data`：成功時的資料，失敗時為 `null`
- `error`：成功時為 `null`，失敗時為 SCREAMING_SNAKE_CASE 錯誤碼字串
- `message`：繁體中文人類可讀說明
- 禁止在回應中直接回傳布林值、純字串或其他非標準結構

## 標準錯誤碼

僅使用下列已定義的錯誤碼，不可自行新增未記錄的錯誤碼：

| 錯誤碼 | 情境 |
|--------|------|
| `UNAUTHORIZED` | JWT 缺失或無效 |
| `NOT_FOUND` | 資源不存在 |
| `VALIDATION_ERROR` | 請求參數格式錯誤 |
| `STOCK_INSUFFICIENT` | 庫存不足 |
| `CART_EMPTY` | 購物車為空 |
| `INVALID_STATUS` | 訂單狀態不允許此操作 |
| `DUPLICATE_EMAIL` | Email 已被註冊 |
| `INVALID_CREDENTIALS` | 帳號或密碼錯誤 |

## 路由命名

- API 路徑使用 kebab-case，例如 `/api/admin/products`、`/api/orders/:id/pay`
- 路由函式使用匿名 arrow function：`router.get('/', (req, res) => { ... })`

## OpenAPI 文件

每個路由必須加上 `@openapi` JSDoc 標注，格式參考 `docs/DEVELOPMENT.md` 的範例。
新增端點後執行 `npm run openapi` 更新 `openapi.json`。

## 購物車雙模式認證（dualAuth）

- `Authorization` header 存在但 token 無效 → 直接回 401，**不 fallback 至 session**
- 只有 `Authorization` header 完全不存在時才使用 `req.sessionId`（由 `X-Session-Id` header 注入）
- 兩者均不存在 → 401
