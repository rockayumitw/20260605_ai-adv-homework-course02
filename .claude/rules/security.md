---
# 全域安全性規則（無 paths 限制，適用於所有檔案）
---

# 安全性規則

## JWT 處理

- JWT secret **只能從 `process.env.JWT_SECRET` 取得**，禁止硬編碼任何 secret 字串
- 使用 `{ algorithms: ['HS256'] }` 選項驗證 token：`jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })`
- 驗證後須再查 DB 確認使用者仍存在，防止已刪除帳號的 token 仍有效

## 密碼處理

- bcrypt salt rounds：生產環境 10，`NODE_ENV=test` 時 1（由 `seedAdminUser()` 自動處理）
- 永遠不在 API 回應中回傳 `password_hash` 欄位
- 登入失敗不區分「帳號不存在」與「密碼錯誤」，統一回傳 `INVALID_CREDENTIALS`（防帳號列舉）

## 禁止 Commit 的檔案

以下檔案**不可 commit**，確認 `.gitignore` 已涵蓋：

- `.env`、`.env.*`（JWT_SECRET 等機密）
- `database.sqlite`、`*.sqlite-wal`、`*.sqlite-shm`
- `*.lock`（package-lock.json 除外，該檔應 commit）

## 管理員 API 保護

所有 `/api/admin/**` 路由必須同時套用兩個 middleware：

```javascript
router.use(authMiddleware);   // 驗證 JWT，注入 req.user
router.use(adminMiddleware);  // 確認 req.user.role === 'admin'
```

缺少任一層保護均屬安全漏洞。

## SQL Injection 防護

禁止任何形式的字串拼接 SQL。永遠使用 prepared statements（詳見 `database.md` 規則）。

## ECPay 金流安全

- ECPay CheckMacValue 計算必須使用 `src/services/ecpayService.js`，不可自行實作
- 處理綠界 notify（`POST /api/ecpay/notify`）時必須驗證 CheckMacValue，防止偽造付款通知
- notify 端點必須回傳純文字 `1|OK`（非 JSON）

## CORS

CORS origin 從 `process.env.FRONTEND_URL` 取得，預設 `http://localhost:3001`，禁止設為 `*`。
