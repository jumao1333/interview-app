const { getTenantToken } = require('./_lib/feishu');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    await getTenantToken();
    res.status(200).json({ status: 'ok', feishu_connected: true });
  } catch {
    res.status(200).json({ status: 'ok', feishu_connected: false });
  }
};
