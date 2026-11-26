# 配送費用模組與分層測試計畫

## User Story
身為花卉電商開發者，我希望結帳時能依配送方式計算運費，並以分層測試與 GitHub Actions 守住訂單流程，以便安全地持續迭代。

## Spec
- [x] `src/utils/shipping.js` 獨立計算運費（宅配 120、超商 60、小計 ≥1,500 免基本運費、偏遠 +200、急件 +250）
- [x] 附加費兩種配送方式皆適用；免運只免基本運費，附加費照收
- [x] `POST /api/orders` 整合運費，`total_amount = subtotal + shipping_fee`
- [x] `POST /api/shipping/quote` 供前端試算
- [x] 結帳頁提供配送方式、偏遠、急件選項
- [x] Unit / Integration / E2E 測試與 `npm run test:unit|test:integration|test:e2e|postman`（E2E 已實跑通過）
- [ ] `.github/workflows/test.yml` 執行 unit 與 integration（已建立，待 Actions 實跑通過）
- [x] docs、openapi.json、README 更新

## Tasks
- [x] Shipping 模組與 Unit Test
- [x] DB 欄位與 `DATABASE_PATH`
- [x] 訂單路由整合、quote 端點
- [x] 前端結帳頁
- [x] Integration Test（記憶體 SQLite）
- [x] E2E 與 Postman 產生器
- [x] GitHub Actions
- [ ] 文件與歸檔（待 Actions 驗證完成後再移至 archive）
