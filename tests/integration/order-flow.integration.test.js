// Integration Test：建立會員 → 取得商品 → 加入購物車 → 建立訂單（含配送）。
// 使用記憶體 SQLite（DATABASE_PATH=:memory:，由 vitest.integration.config.js 設定），不會動到 database.sqlite。
const request = require('supertest');
const app = require('../../app');
const db = require('../../src/database');

async function registerUser() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `it-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      password: 'password123',
      name: '整合測試會員',
    });
  expect(res.status).toBe(201);
  return { token: res.body.data.token, userId: res.body.data.user.id };
}

async function adminCreateProduct({ name, price, stock }) {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@hexschool.com', password: '12345678' });
  const res = await request(app)
    .post('/api/admin/products')
    .set('Authorization', `Bearer ${login.body.data.token}`)
    .send({ name, price, stock });
  expect(res.status).toBe(201);
  return res.body.data;
}

function addToCart(token, productId, quantity = 1) {
  return request(app)
    .post('/api/cart')
    .set('Authorization', `Bearer ${token}`)
    .send({ productId, quantity });
}

function createOrder(token, body = {}) {
  return request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      recipientName: '測試收件人',
      recipientEmail: 'recipient@example.com',
      recipientAddress: '台北市信義區松仁路100號',
      ...body,
    });
}

const stockOf = (productId) => db.prepare('SELECT stock FROM products WHERE id = ?').get(productId).stock;
const orderCount = (userId) => db.prepare('SELECT COUNT(*) AS c FROM orders WHERE user_id = ?').get(userId).c;
const cartCount = (userId) => db.prepare('SELECT COUNT(*) AS c FROM cart_items WHERE user_id = ?').get(userId).c;

describe('訂單建立流程（Integration）', () => {
  let cheap; // 單價 1000，小計 < 1500
  let pricey; // 單價 1600，小計 >= 1500

  beforeAll(async () => {
    cheap = await adminCreateProduct({ name: '整合測試-平價花', price: 1000, stock: 10 });
    pricey = await adminCreateProduct({ name: '整合測試-精品花', price: 1600, stock: 5 });
  });

  it('商品列表可取得測試商品', async () => {
    const res = await request(app).get(`/api/products/${cheap.id}`);
    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data.price).toBe(1000);
  });

  describe('成功建立訂單', () => {
    it('宅配、小計 1,000：運費 120、總額 1,120，並寫入訂單／品項、扣庫存、清空購物車', async () => {
      const { token, userId } = await registerUser();
      const add = await addToCart(token, cheap.id, 1);
      expect(add.status).toBe(200);

      const res = await createOrder(token, { shippingMethod: 'home' });

      expect(res.status).toBe(201);
      expect(res.body.error).toBeNull();
      expect(res.body.message).toBeTypeOf('string');
      expect(res.body.data).toMatchObject({
        subtotal: 1000,
        shipping_method: 'home',
        shipping_fee: 120,
        total_amount: 1120,
        status: 'pending',
      });
      expect(res.body.data.order_no).toMatch(/^ORD-\d{8}-[A-Z0-9]{5}$/);

      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(res.body.data.id);
      expect(order).toMatchObject({
        user_id: userId,
        recipient_name: '測試收件人',
        subtotal: 1000,
        shipping_fee: 120,
        total_amount: 1120,
        is_remote: 0,
        is_same_day: 0,
      });

      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        product_id: cheap.id,
        product_name: '整合測試-平價花',
        product_price: 1000,
        quantity: 1,
      });

      expect(stockOf(cheap.id)).toBe(9);
      expect(cartCount(userId)).toBe(0);
    });

    it('超商取貨、小計 2 × 1,000 = 2,000（滿額）：基本運費免，附加費照收', async () => {
      const { token, userId } = await registerUser();
      const before = stockOf(cheap.id);
      await addToCart(token, cheap.id, 2);

      const res = await createOrder(token, {
        shippingMethod: 'convenience',
        isRemote: true,
        isSameDay: true,
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        subtotal: 2000,
        shipping_method: 'convenience',
        shipping_fee: 450, // 基本 0 + 偏遠 200 + 急件 250
        total_amount: 2450,
        is_remote: true,
        is_same_day: true,
      });
      expect(stockOf(cheap.id)).toBe(before - 2);
      expect(cartCount(userId)).toBe(0);
    });

    it('未帶配送參數時預設為宅配', async () => {
      const { token } = await registerUser();
      await addToCart(token, cheap.id, 1);
      const res = await createOrder(token);
      expect(res.status).toBe(201);
      expect(res.body.data.shipping_method).toBe('home');
      expect(res.body.data.shipping_fee).toBe(120);
    });

    it('可由訂單詳情取回運費資訊', async () => {
      const { token } = await registerUser();
      await addToCart(token, pricey.id, 1);
      const created = await createOrder(token, { shippingMethod: 'home', isRemote: true });
      expect(created.body.data.shipping_fee).toBe(200); // 滿額免基本運費，僅偏遠 200

      const detail = await request(app)
        .get(`/api/orders/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(detail.status).toBe(200);
      expect(detail.body.data).toMatchObject({ subtotal: 1600, shipping_fee: 200, total_amount: 1800 });
      expect(detail.body.data.items).toHaveLength(1);
    });
  });

  describe('建立訂單失敗', () => {
    it('配送方式不合法 → 400 VALIDATION_ERROR，不建立訂單、不扣庫存、購物車保留', async () => {
      const { token, userId } = await registerUser();
      await addToCart(token, cheap.id, 1);
      const stockBefore = stockOf(cheap.id);

      const res = await createOrder(token, { shippingMethod: 'drone' });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ data: null, error: 'VALIDATION_ERROR' });
      expect(orderCount(userId)).toBe(0);
      expect(stockOf(cheap.id)).toBe(stockBefore);
      expect(cartCount(userId)).toBe(1);
    });

    it('isRemote 不是布林值 → 400 VALIDATION_ERROR', async () => {
      const { token, userId } = await registerUser();
      await addToCart(token, cheap.id, 1);
      const res = await createOrder(token, { isRemote: 'yes' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(orderCount(userId)).toBe(0);
    });

    it('購物車為空 → 400 CART_EMPTY，不建立訂單', async () => {
      const { token, userId } = await registerUser();
      const res = await createOrder(token);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('CART_EMPTY');
      expect(orderCount(userId)).toBe(0);
    });

    it('下單當下庫存不足 → 400 STOCK_INSUFFICIENT，不建立訂單、庫存不變', async () => {
      const { token, userId } = await registerUser();
      await addToCart(token, pricey.id, 2);
      // 加入購物車後庫存被調低（例如被其他人買走）
      db.prepare('UPDATE products SET stock = 1 WHERE id = ?').run(pricey.id);

      const res = await createOrder(token);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('STOCK_INSUFFICIENT');
      expect(orderCount(userId)).toBe(0);
      expect(stockOf(pricey.id)).toBe(1);
      expect(cartCount(userId)).toBe(1);
      db.prepare('UPDATE products SET stock = 5 WHERE id = ?').run(pricey.id);
    });

    it('transaction 中途失敗 → 全部回滾：不留下不完整訂單、庫存與購物車不變', async () => {
      const { token, userId } = await registerUser();
      await addToCart(token, cheap.id, 1);
      const stockBefore = stockOf(cheap.id);

      // 在 order_items 寫入時強制失敗，模擬 transaction 中途出錯
      db.exec(`CREATE TRIGGER it_force_fail BEFORE INSERT ON order_items
               BEGIN SELECT RAISE(ABORT, 'forced failure'); END;`);
      let res;
      try {
        res = await createOrder(token);
      } finally {
        db.exec('DROP TRIGGER IF EXISTS it_force_fail');
      }

      expect(res.status).toBe(500);
      expect(res.body.data).toBeNull();
      expect(orderCount(userId)).toBe(0);
      expect(
        db.prepare(
          'SELECT COUNT(*) AS c FROM order_items WHERE order_id NOT IN (SELECT id FROM orders)'
        ).get().c
      ).toBe(0);
      expect(stockOf(cheap.id)).toBe(stockBefore);
      expect(cartCount(userId)).toBe(1);
    });

    it('未登入 → 401', async () => {
      const res = await request(app).post('/api/orders').send({});
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/shipping/quote', () => {
    it('回傳運費與合計', async () => {
      const res = await request(app)
        .post('/api/shipping/quote')
        .send({ subtotal: 1499, shippingMethod: 'home' });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ shippingFee: 120, total: 1619 });
    });

    it('參數不合法 → 400', async () => {
      const res = await request(app)
        .post('/api/shipping/quote')
        .send({ subtotal: 'abc', shippingMethod: 'home' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });
});
