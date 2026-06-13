const { TABLES, writeToFeishu, buildFields } = require('./_lib/feishu');
const https = require('https');

// 递归拉取所有记录
function feishuListAll(tableId, pageToken) {
  const { getTenantToken } = require('./_lib/feishu');
  return getTenantToken().then(token => new Promise((resolve, reject) => {
    let path = `/bitable/v1/apps/SIAAbq5X4acWPys8rRUcj9ZYnjd/tables/${tableId}/records?page_size=100`;
    if (pageToken) path += `&page_token=${pageToken}`;
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: '/open-apis' + path,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' },
      timeout: 20000,
    }, (resp) => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('API timeout')); });
    req.end();
  }));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  // ===== GET: 拉取记录 =====
  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const role = url.searchParams.get('role');
    if (!role || !TABLES[role]) {
      return res.status(400).json({ error: 'Invalid or missing role', valid_roles: Object.keys(TABLES) });
    }
    try {
      const tableId = TABLES[role].table_id;
      let allRecords = [];
      let pageToken = null;
      do {
        const result = await feishuListAll(tableId, pageToken);
        if (result.code !== 0) {
          return res.status(500).json({ error: result.msg, code: result.code });
        }
        const items = (result.data.items || []).map(r => ({
          record_id: r.record_id,
          fields: r.fields,
        }));
        allRecords = allRecords.concat(items);
        pageToken = result.data.has_more ? result.data.page_token : null;
      } while (pageToken);
      return res.status(200).json({
        success: true, role, table_name: TABLES[role].name,
        total: allRecords.length, records: allRecords,
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ===== POST: 提交数据 =====
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { role, name, position, answers } = req.body;
    if (!role || !TABLES[role]) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    let fields = buildFields(role, name, position || '', answers || {});
    let result = await writeToFeishu(role, fields);

    if (result.code === 0) {
      return res.status(200).json({ success: true, record_id: result.data?.record?.record_id || 'ok' });
    } else {
      console.error('[FEISHU]', JSON.stringify(result));
      return res.status(500).json({ error: result.msg || 'Feishu write failed', code: result.code });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
