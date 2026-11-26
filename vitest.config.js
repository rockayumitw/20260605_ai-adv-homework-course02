import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Unit 設定：shipping 單元測試 + 原有的 API 測試（共用同一個暫存 SQLite，順序固定）
export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    include: [
      'tests/unit/**/*.test.js',
      'tests/auth.test.js',
      'tests/products.test.js',
      'tests/cart.test.js',
      'tests/orders.test.js',
      'tests/adminProducts.test.js',
      'tests/adminOrders.test.js',
      'tests/ecpay.test.js',
    ],
    sequence: {
      files: [
        'tests/unit/shipping.test.js',
        'tests/auth.test.js',
        'tests/products.test.js',
        'tests/cart.test.js',
        'tests/orders.test.js',
        'tests/adminProducts.test.js',
        'tests/adminOrders.test.js',
        'tests/ecpay.test.js',
      ],
    },
    globalSetup: ['tests/globalSetupUnit.js'],
    env: {
      // 測試專用值，不依賴 .env；ECPay 為綠界公開的測試環境金鑰
      JWT_SECRET: 'test-jwt-secret',
      DATABASE_PATH: path.resolve('tests/.tmp/unit.sqlite'),
      ECPAY_MERCHANT_ID: '3002607',
      ECPAY_HASH_KEY: 'pwFHCqoQZGmho4w6',
      ECPAY_HASH_IV: 'EkRm7iFT261dpevs',
      ECPAY_ENV: 'staging',
    },
    hookTimeout: 10000,
  },
});
