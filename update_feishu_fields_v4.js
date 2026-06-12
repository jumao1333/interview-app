/**
 * v4 新增字段：给四张飞书表加新字段
 * node update_feishu_fields_v4.js
 * 密钥从 feishu.js 原样复制，不改
 */
const https = require('https');

// ↓ 原样复制 feishu.js 里的三个常量，一个字母都不改
const FEISHU_APP_ID      = "cli_aaaf92c5f3bb1cbc";
const FEISHU_APP_SECRET  = "C9p9SbxtK3ALcUCYdbaJIgmioB0QfIMj";
const FEISHU_BASE_TOKEN  = "SIAAbq5X4acWPys8rRUcj9ZYnjd"; // bitable app token

const TABLES = {
  content_leader: { name: "内容负责人/管理层", table_id: "tbl1v3vEIITS6NxL" },
  content_editor: { name: "内容编导",       table_id: "tbl8NNSNiw2ZWXYF" },
  broker_leader:  { name: "经纪负责人/管理层", table_id: "tblxmIJ6N44chyYR" },
  broker:         { name: "经纪",             table_id: "tblMF5VM45WxKjZq" },
};

// 新增字段定义：[字段名, 字段类型(1=文本 3=单选)]
const NEW_FIELDS = {
  content_leader: [
    ["QH6-失误反演",                  1],
    ["Q9-核心数字基线",                1],
    ["Q10-上周重复沟通时间占比",      1],
  ],
  content_editor: [
    ["Q5-案例说明v4",                 1],
    ["QH4-失误反演",                 1],
    ["Q11-上周工作时长分布",            1],
    ["Q12-上月产出及返工",            1],
  ],
  broker_leader: [
    ["Q8-v4-团队判断差距",            1],
    ["Q9-v4-50分成让步边界",          1],
    ["Q10-v4-核心数字基线",           1],
    ["Q11-v4-扩编vs提质量",          1],
    ["QH6-失误反演",                 1],
    ["Q12-v4-上周推进卡住时间占比",  1],
  ],
  broker: [
    ["QH4-失误反演",                 1],
    ["Q9-上月接触深聊签约数字",       1],
    ["Q10-上周跟进卡住时间占比",      1],
  ],
};

function req(opts, body) {
  return new Promise((res, rej) => {
    const r = https.request(opts, (s) => {
      let d = '';
      s.on('data', c => d += c);
      s.on('end', () => { try { res(JSON.parse(d)); } catch(e) { res({ code:-1, raw:d }); } });
    });
    r.on('error', rej);
    if (body) r.write(body);
    r.end();
  });
}

async function getToken() {
  const d = await req({
    hostname: 'open.feishu.cn',
    path: '/open-apis/auth/v3/tenant_access_token/internal',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }));
  if (d.code !== 0) throw new Error('Token err: ' + JSON.stringify(d));
  return d.tenant_access_token;
}

async function getFields(token, tableId) {
  const d = await req({
    hostname: 'open.feishu.cn',
    path: `/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${tableId}/fields`,
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token },
  });
  return d;
}

async function addField(token, tableId, fieldName, fieldType) {
  const d = await req({
    hostname: 'open.feishu.cn',
    path: `/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${tableId}/fields`,
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
  }, JSON.stringify({ field_name: fieldName, type: fieldType }));
  return d;
}

(async function () {
  const token = await getToken();
  console.log('✓ Token obtained');

  for (const [role, fields] of Object.entries(NEW_FIELDS)) {
    const t = TABLES[role];
    console.log(`\n[${role}] ${t.name}`);

    // 查已有字段
    let existing = [];
    try {
      const fd = await getFields(token, t.table_id);
      if (fd.code === 0 && fd.data && fd.data.items) {
        existing = fd.data.items.map(f => f.field_name);
      }
    } catch (e) { /* ignore */ }

    for (const [fname, ftype] of fields) {
      if (existing.includes(fname)) {
        console.log(`  - already: ${fname}`);
        continue;
      }
      const r = await addField(token, t.table_id, fname, ftype);
      if (r.code === 0) {
        console.log(`  ✓ added:  ${fname}`);
      } else if (r.code === 1254021) {
        console.log(`  - exists:  ${fname} (concurrent)`);
      } else {
        console.log(`  ✗ fail(${r.code}): ${fname} → ${r.msg}`);
      }
      await new Promise(r => setTimeout(r, 350));
    }
  }
  console.log('\nDone!');
})();
