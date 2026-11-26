const { test, expect } = require('@playwright/test');

// E2E：直接使用「已啟動」的 http://localhost:3001（不另外啟動測試伺服器）。
// 流程：登入 → 加入購物車 → 結帳（選配送方式）→ 建立訂單 → 綠界 網路ATM／土地銀行 → Save → 返回商店 → 驗證已付款。
test('完整購物結帳流程：登入 → 結帳（含配送）→ 綠界網路 ATM → 返回商店 → 訂單已付款', async ({ page }) => {
  test.setTimeout(300000);

  // 綠界若使用 JS confirm/alert，需接受才能讓流程繼續
  page.on('dialog', (dialog) => dialog.accept().catch(() => {}));

  // 1. 登入
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@hexschool.com');
  await page.fill('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10000 });

  // 2. 選擇商品並加入購物車
  await page.goto('/');
  const addBtn = page.locator('button').filter({ hasText: '+ 加入' }).first();
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.click();

  // 3. 進入購物車 → 結帳頁
  await page.goto('/cart');
  const checkoutBtn = page.locator('button').filter({ hasText: '前往結帳' });
  await checkoutBtn.waitFor({ state: 'visible', timeout: 10000 });
  await checkoutBtn.click();
  await page.waitForURL(/\/checkout/);

  // 4. 填寫配送方式與結帳資料
  await page.fill('input[placeholder="請輸入收件人姓名"]', 'E2E 收件人');
  await page.fill('input[type="email"]', 'e2e@example.com');
  await page.fill('input[placeholder="台北市⋯"]', '台北市信義區松仁路100號');
  await page.getByTestId('shipping-convenience').click(); // 超商取貨
  const feeLocator = page.getByTestId('shipping-fee');
  await expect(feeLocator).toBeVisible();
  await page.getByTestId('is-remote').check(); // 偏遠地區 +200
  await expect(feeLocator).toContainText('200'); // 無論是否滿額免運，附加費都會出現

  // 5. 建立訂單
  await page.click('button:has-text("確認訂單")');
  await page.waitForURL(/\/orders\/[a-z0-9-]+$/, { timeout: 20000 });
  const orderUrl = page.url();
  const orderId = orderUrl.split('/').pop();
  await expect(page.getByText('運費（超商取貨・偏遠）')).toBeVisible();

  // 6. 前往綠界測試環境
  await page.locator('button').filter({ hasText: '前往綠界付款' }).click();
  await page.waitForURL(/ecpay\.com\.tw/, { timeout: 30000 });

  // 7. 選擇「網路 ATM」
  await page.locator('#liWebATM, [id*="WebATM"]:not(select):not(a)').first().click();

  // 8. 選擇「台灣土地銀行」
  await page.evaluate(() => {
    const sel = document.getElementById('selWebATMBank');
    const land = Array.from(sel.options).find((o) => o.text.includes('土地') || o.value.toUpperCase().includes('LAND'));
    sel.value = land.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // 9. 點擊「前往付款」（可能在新視窗或同頁導向土地銀行測試頁）
  const popupPromise = page.context().waitForEvent('page', { timeout: 90000 }).catch(() => null);
  await page.evaluate(() => document.getElementById('WebATMPaySubmit').click());

  // 10. 關閉提示視窗
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    for (const sel of ['#btnClose', '.simplert__close', '.simplert__footer button']) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) { el.click(); return; }
      }
    }
  });

  // 11. 在土地銀行測試頁面點擊 Save
  const popup = await popupPromise;
  const bankPage = popup || page;
  if (!popup) await page.waitForURL(/MockMPPost|LandWebAtm/, { timeout: 60000 });
  await bankPage.waitForLoadState('domcontentloaded');
  await bankPage.locator('input[value="Save" i], button:has-text("Save"), input[type="submit"]').first().click();

  // 12. 等待綠界顯示付款成功 → 13. 返回商店
  // 綠界付款成功後會自動送出 OrderResultURL 導回商店；若停在結果頁出現「返回商店」按鈕，則手動點擊。
  const backToShop = page.getByText('返回商店').first();
  const returned = page.waitForURL(new RegExp(`/orders/${orderId}`), { timeout: 90000 });
  await Promise.race([
    returned,
    backToShop.waitFor({ state: 'visible', timeout: 90000 }).then(() => backToShop.click()),
  ]);

  // 14. 驗證訂單顯示「已付款」
  await page.waitForURL(new RegExp(`/orders/${orderId}`), { timeout: 30000 });
  await expect(page.getByText('已付款').first()).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: 'test-results/payment-success-returned.png', fullPage: true });

  // 15. 驗證訂單狀態為 paid（走 API，確認不只是畫面）
  const token = await page.evaluate(() => localStorage.getItem('flower_token'));
  const res = await page.request.get(`/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.data.status).toBe('paid');
  expect(body.data.shipping_method).toBe('convenience');
  expect(body.data.is_remote).toBe(1);
});
