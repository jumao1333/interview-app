const { TABLES, writeToFeishu, buildFields } = require('./_lib/feishu');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

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

    const fields = buildFields(role, name, position || '', answers || {});
    const result = await writeToFeishu(role, fields);

    if (result.code === 0) {
      return res.status(200).json({ success: true, record_id: result.data?.record?.record_id || 'ok' });
    } else {
      console.error('[FEISHU]', JSON.stringify(result));
      return res.status(500).json({ error: result.msg || 'Feishu write failed' });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
