// 將 openapi.json 轉成 Postman Collection v2.1（輸出到 postman/，屬於可自動生成的衍伸物，不 commit）
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'openapi.json'), 'utf-8'));
const outDir = path.join(root, 'postman');
const outFile = path.join(outDir, 'flower-ecommerce.postman_collection.json');

// 依 schema 產生範例值（優先 example → default → enum 第一個 → 依型別給預設）
function sample(schema) {
  if (!schema) return undefined;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum) return schema.enum[0];
  switch (schema.type) {
    case 'object': {
      const obj = {};
      for (const [k, v] of Object.entries(schema.properties || {})) obj[k] = sample(v);
      return obj;
    }
    case 'array': return [sample(schema.items)];
    case 'integer': case 'number': return 1;
    case 'boolean': return false;
    case 'string': return schema.format === 'email' ? 'user@example.com' : 'string';
    default: return null;
  }
}

// 讓登入／結帳等常用請求開箱即用
const BODY_OVERRIDES = {
  'POST /api/auth/login': { email: 'admin@hexschool.com', password: '12345678' },
  'POST /api/auth/register': { email: 'postman-user@example.com', password: 'password123', name: 'Postman 使用者' },
  'POST /api/cart': { productId: '{{productId}}', quantity: 1 },
  'POST /api/orders': {
    recipientName: '測試收件人',
    recipientEmail: 'test@example.com',
    recipientAddress: '台北市信義區松仁路100號',
    shippingMethod: 'home',
    isRemote: false,
    isSameDay: false,
  },
  'POST /api/shipping/quote': { subtotal: 1000, shippingMethod: 'home', isRemote: false, isSameDay: false },
};

const SAVE_TOKEN_SCRIPT = [
  "const json = pm.response.json();",
  "if (json && json.data && json.data.token) {",
  "  pm.collectionVariables.set('token', json.data.token);",
  "}",
];

function buildRequest(method, urlPath, op) {
  const key = `${method.toUpperCase()} ${urlPath}`;
  const security = op.security || [];
  const needsBearer = security.some((s) => s.bearerAuth);
  const acceptsSession = security.some((s) => s.sessionId);

  // /api/orders/{id} → /api/orders/:id（Postman path variable）
  const pmPath = urlPath.replace(/\{(\w+)\}/g, ':$1').split('/').filter(Boolean);
  const variable = [...urlPath.matchAll(/\{(\w+)\}/g)].map((m) => ({ key: m[1], value: `{{${m[1]}}}` }));
  const query = (op.parameters || [])
    .filter((p) => p.in === 'query')
    .map((p) => ({ key: p.name, value: String(sample(p.schema) ?? ''), disabled: true }));

  const header = [];
  if (acceptsSession) header.push({ key: 'X-Session-Id', value: '{{sessionId}}' });

  const request = {
    method: method.toUpperCase(),
    header,
    url: {
      raw: `{{baseUrl}}/${pmPath.join('/')}`,
      host: ['{{baseUrl}}'],
      path: pmPath,
      ...(variable.length ? { variable } : {}),
      ...(query.length ? { query } : {}),
    },
    description: [op.summary, acceptsSession ? '購物車支援 JWT 或 X-Session-Id 二擇一；Authorization 存在但無效時直接 401。' : '']
      .filter(Boolean).join('\n\n'),
  };

  // collection 層級已設定 Bearer {{token}}；不需要登入的 API 明確關閉
  if (!needsBearer && !acceptsSession) request.auth = { type: 'noauth' };

  const jsonBody = op.requestBody?.content?.['application/json']?.schema;
  if (jsonBody) {
    request.header.push({ key: 'Content-Type', value: 'application/json' });
    const body = BODY_OVERRIDES[key] || sample(jsonBody);
    request.body = { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
  }

  const item = { name: `${op.summary || key}`, request };
  if (key === 'POST /api/auth/login' || key === 'POST /api/auth/register') {
    item.event = [{ listen: 'test', script: { type: 'text/javascript', exec: SAVE_TOKEN_SCRIPT } }];
  }
  return item;
}

const folders = new Map();
for (const [urlPath, methods] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    const tag = (op.tags && op.tags[0]) || 'Default';
    if (!folders.has(tag)) folders.set(tag, []);
    folders.get(tag).push(buildRequest(method, urlPath, op));
  }
}

const collection = {
  info: {
    name: spec.info?.title || 'API',
    description: spec.info?.description || '',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3001' },
    { key: 'token', value: '' },
    { key: 'sessionId', value: 'postman-session-001' },
    { key: 'productId', value: '' },
    { key: 'id', value: '' },
    { key: 'itemId', value: '' },
  ],
  item: [...folders.entries()].map(([name, item]) => ({ name, item })),
};

const json = JSON.stringify(collection, null, 2);
JSON.parse(json); // 確認輸出為有效 JSON
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, json);
console.log(`Postman collection generated: ${path.relative(root, outFile)} (${folders.size} folders)`);
