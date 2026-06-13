/**
 * 独立 API Server — 用于国内访问
 * 支持 /api/submit, /api/health, /api/get (GET records)
 * 用法: node server.js [PORT]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// === 飞书模块 ===
const { writeToFeishu, buildFields, getTenantToken, TABLES } = require('./api/_lib/feishu');

const PORT = process.env.PORT || 3000;

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// === 静态文件服务 ===
function serveStatic(filePath, res) {
  const fullPath = path.join(__dirname, filePath);
  if (!fullPath.startsWith(__dirname)) { res.writeHead(403); return res.end('Forbidden'); }
  
  const ext = path.extname(fullPath);
  fs.readFile(fullPath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not Found'); }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// === 路由 ===
async function handleApi(req, url, method, body, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    return res.end();
  }

  // Health check
  if (url === '/api/health' && method === 'GET') {
    try {
      await getTenantToken();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', feishu_connected: true }));
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', feishu_connected: false }));
    }
    return;
  }

  // Submit
  if (url === '/api/submit' && method === 'POST') {
    try {
      const payload = typeof body === 'string' ? JSON.parse(body) : body;
      const { role, name, position, answers } = payload;

      if (!role || !TABLES[role]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid role' }));
      }
      if (!name) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Name is required' }));
      }

      const fields = buildFields(role, name, position || '', answers || {});
      console.log(`[SUBMIT] role=${role} name=${name} fields=${Object.keys(fields).length}`);

      const result = await writeToFeishu(role, fields);
      if (result.code === 0) {
        const recordId = result.data?.record?.record_id || 'ok';
        console.log(`[SUBMIT] OK record_id=${recordId}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, record_id: recordId }));
      } else {
        console.error('[FEISHU]', JSON.stringify(result));
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: result.msg || 'Feishu write failed', code: result.code }));
      }
    } catch (e) {
      console.error('[ERROR]', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // GET records
  if (url.startsWith('/api/get') && method === 'GET') {
    try {
      const params = new URL(url, `http://localhost`).searchParams;
      const role = params.get('role');
      if (!role || !TABLES[role]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid role' }));
      }

      // 简化版：返回成功但不拉取记录（避免复杂分页逻辑）
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        role,
        table_name: TABLES[role].name,
        total: 0,
        records: [],
        note: 'CloudStudio mode - listing disabled'
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'API not found' }));
}

// === 主服务器 ===
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`).pathname;
  const method = req.method.toUpperCase();

  // API routes
  if (url.startsWith('/api/')) {
    let body = '';
    await new Promise(resolve => req.on('data', c => body += c).on('end', resolve));
    return handleApi(req, url, method, body, res);
  }

  // Static files - default to index.html for SPA routing
  let filePath = url === '/' ? '/index.html' : url;
  serveStatic(filePath, res);
});

server.listen(PORT, () => {
  console.log(`🚀 Interview API Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});
