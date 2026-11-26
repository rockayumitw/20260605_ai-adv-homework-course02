// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    // 直接使用已啟動的專案（npm run dev:server / npm start），不另外啟動測試伺服器
    baseURL: 'http://localhost:3001',
    // 預設 headless（Codespaces 沒有顯示器）；要看畫面時：HEADED=1 npm run test:e2e
    headless: !process.env.HEADED,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
