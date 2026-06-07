---
paths:
  - "src/database.js"
  - "src/routes/**"
---

# 資料庫規則

## Prepared Statements 強制要求

所有資料庫查詢一律使用 prepared statements：

```javascript
// 正確
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(id, email);

// 禁止
db.exec(`SELECT * FROM users WHERE id = '${userId}'`);  // SQL injection 風險
```

- 使用 `db.prepare(...).run()` 執行 INSERT/UPDATE/DELETE
- 使用 `db.prepare(...).get()` 取得單筆資料
- 使用 `db.prepare(...).all()` 取得多筆資料

## 欄位命名

DB 欄位一律使用 snake_case：`password_hash`、`order_no`、`total_amount`、`created_at`。

## 訂單建立 Transaction

`POST /api/orders` 必須使用 `db.transaction()` 確保原子性，包含以下四步驟：

```javascript
const createOrder = db.transaction((orderData, items, userId) => {
  // 1. INSERT orders
  // 2. INSERT order_items（逐一插入，保留下單時商品資訊）
  // 3. UPDATE products SET stock = stock - quantity（每個商品扣庫存）
  // 4. DELETE cart_items WHERE user_id = ?（清空購物車）
});
```

任一步驟失敗則全部回滾。

## 非正規化欄位

`order_items` 表的 `product_name` 和 `product_price` 為非正規化欄位，記錄**下單當時**的商品資訊，不應從 products 表動態 JOIN 取得現值。

## Schema 約束

- `products.price`：正整數，CHECK price > 0
- `products.stock`：非負整數，CHECK stock >= 0
- `cart_items.quantity`：正整數，CHECK quantity > 0
- `orders.status`：CHECK IN ('pending', 'paid', 'failed')
- `users.role`：CHECK IN ('user', 'admin')
- `orders.order_no` 格式：`ORD-YYYYMMDD-XXXXX`
