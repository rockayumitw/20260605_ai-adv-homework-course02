import { defineConfig } from 'vitest/config';

// Integration 設定：使用記憶體 SQLite，不會碰到專案的 database.sqlite
export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    include: ['tests/integration/**/*.integration.test.js'],
    env: {
      JWT_SECRET: 'test-jwt-secret',
      DATABASE_PATH: ':memory:',
      ECPAY_MERCHANT_ID: '3002607',
      ECPAY_HASH_KEY: 'pwFHCqoQZGmho4w6',
      ECPAY_HASH_IV: 'EkRm7iFT261dpevs',
      ECPAY_ENV: 'staging',
    },
    hookTimeout: 10000,
  },
});
