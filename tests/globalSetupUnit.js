import fs from 'node:fs';
import path from 'node:path';

// 每次執行 unit 測試前重建暫存資料庫，避免殘留資料影響結果，也不碰專案的 database.sqlite
export default function setup() {
  const dir = path.resolve('tests/.tmp');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}
