/**
 * GET /api/records?role=content_leader
 * 从飞书多维表格拉取所有记录，返回 JSON
 */
const { TABLES, getTenantToken } = require('./_lib/feishu.js');
const https = require('https');

function feishuApi(method, pathStr, data) {
  return getTenantToken().then(token => new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: '/open-apis' + pathStr,
      method,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' },
      timeout: 20000,
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('API timeout')); });
    if (body) req.write(body);
    req.end();
  }));
}

// 递归拉取所有记录（处理分页）
async function listAllRecords(tableId, pageToken) {
  let path = `/bitable/v1/apps/SIAAbq5X4acWPys8rRUcj9ZYnjd/tables/${tableId}/records?page_size=100`;
  if (pageToken) path += `&page_token=${pageToken}`;
  const result = await feishuApi('GET', path);
  return result;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const role = url.searchParams.get('role');

  if (!role || !TABLES[role]) {
    res.status(400).json({ error: 'Invalid or missing role', valid_roles: Object.keys(TABLES) });
    return;
  }

  try {
    const tableId = TABLES[role].table_id;
    let allRecords = [];
    let pageToken = null;

    // 分页拉取全部记录
    do {
      const result = await listAllRecords(tableId, pageToken);
      if (result.code !== 0) {
        res.status(500).json({ error: result.msg, code: result.code });
        return;
      }
      const items = (result.data.items || []).map(r => ({
        record_id: r.record_id,
        fields: r.fields,
      }));
      allRecords = allRecords.concat(items);
      pageToken = result.data.has_more ? result.data.page_token : null;
    } while (pageToken);

    res.status(200).json({
      success: true,
      role: role,
      table_name: TABLES[role].name,
      total: allRecords.length,
      records: allRecords,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
