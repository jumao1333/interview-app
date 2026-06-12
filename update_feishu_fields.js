/**
 * 飞书多维表格字段更新脚本 v3
 * 用途：为四个表格新增/重命名题目字段
 * 用法：node update_feishu_fields.js
 */
const https = require('https');

const FEISHU_APP_ID = "cli_aaaf92c5f3bb1cbc";
const FEISHU_APP_SECRET = "C9p9SbxtK3ALcUCYdbaJIgmioB0QfIMj";
const FEISHU_BASE_TOKEN = "SIAAbq5X4acWPys8rRUcj9ZYnjd";

const TABLES = {
  content_leader: { name: "内容负责人/管理层", table_id: "tbl1v3vEIITS6NxL" },
  content_editor: { name: "内容编导", table_id: "tbl8NNSNiw2ZWXYF" },
  broker_leader: { name: "经纪负责人/管理层", table_id: "tblxmIJ6N44chyYR" },
  broker: { name: "经纪", table_id: "tblMF5VM45WxKjZq" },
};

let tokenCache = { token: null, expiresAt: 0 };

function getTenantToken() {
  return new Promise((resolve, reject) => {
    if (tokenCache.token && Date.now() < tokenCache.expiresAt - 300000) {
      return resolve(tokenCache.token);
    }
    const body = JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET });
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: '/open-apis/auth/v3/tenant_access_token/internal',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          if (r.code === 0) {
            tokenCache = { token: r.tenant_access_token, expiresAt: Date.now() + (r.expire || 6000) * 1000 };
            resolve(tokenCache.token);
          } else reject(new Error(r.msg || 'Token failed'));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Token timeout')); });
    req.write(body);
    req.end();
  });
}

function feishuApi(method, pathStr, data) {
  return getTenantToken().then(token => new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: '/open-apis' + pathStr,
      method,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' },
      timeout: 15000,
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

// 列出表格所有字段
function listFields(tableId) {
  return feishuApi('GET', `/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${tableId}/fields?page_size=100`);
}

// 新增字段
// type: 1=多行文本, 3=数字, 4=多选
function addField(tableId, fieldName, type, options) {
  const body = { field_name: fieldName, type: type };
  if (options) body.property = { options: options.map(o => ({ name: o })) };
  return feishuApi('POST', `/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${tableId}/fields`, body);
}

// 重命名字段
function renameField(tableId, fieldId, newName) {
  return feishuApi('PUT', `/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${tableId}/fields/${fieldId}`, { field_name: newName });
}

// 新字段定义 { field_name, type, options? }
const NEW_FIELDS = {
  content_leader: [
    { field_name: 'QH4-可复制标准', type: 1 },  // was QH4 失败归因(select) → now text
  ],
  content_editor: [
    { field_name: 'QH2-AI最易写错内容v3', type: 4, options: ['情绪类','人设类','故事类','干货类','带货类','观点类','口播类','剧情类'] },
    { field_name: 'QH2-写错原因v3', type: 1 },
    { field_name: 'QH3-拍摄前检查5项', type: 4, options: ['开头是否抓人','语言是否像本人','是否有具体画面','是否可拍','是否方便后期剪','是否符合账号风格','是否有爆点','是否踩雷','素材是否够','拍摄成本是否过高'] },
    { field_name: 'QH3-检查原因', type: 1 },
    { field_name: 'Q10-拍摄与后期最易出问题v3', type: 4, options: ['达人状态不对','表达不像本人','画面不好拍','临场补信息','素材不够','时间不够','脚本太书面','节奏/重点信息说不清','画面选择/字幕包装分歧','账号风格/情绪感觉对不齐'] },
    { field_name: 'Q10-补充说明v3', type: 1 },
  ],
  broker_leader: [
    { field_name: 'QH4-AI初筛8信息v3', type: 4, options: ['当前月收入','粉丝量','近30天涨粉','近30天播放','内容稳定性','商业化方式','报价/收入结构','人设稀缺性','账号风险','配合意愿','公司可承接度','未来增长空间'] },
    { field_name: 'QH4-初筛关键前三v3', type: 1 },
  ],
  broker: [
    { field_name: 'QH1-值得聊的信号v3', type: 4, options: ['当前收入高','内容能力强','商业化强','愿意沟通','有增长空间','对公司服务感兴趣','有明显痛点','对现状不满意','竞品机构没服务好','能接受分成逻辑'] },
    { field_name: 'QH1-信号案例v3', type: 1 },
    { field_name: 'QH3-最卡话术类型', type: 4, options: ['开场破冰','介绍公司','证明公司能带来增量','解释50%分成','处理对方不信任','处理对方嫌分成高','约下一次沟通','推动签约'] },
    { field_name: 'QH3-卡住的原话', type: 1 },
  ],
};

async function main() {
  console.log('=== 飞书字段更新脚本 v3 ===\n');

  for (const [role, fields] of Object.entries(NEW_FIELDS)) {
    if (fields.length === 0) {
      console.log(`[${role}] 无需新增字段，跳过\n`);
      continue;
    }
    const tableId = TABLES[role].table_id;
    console.log(`[${role}] 处理表格 ${tableId}，需新增 ${fields.length} 个字段`);

    // 先列出已有字段
    let existingFields = [];
    try {
      const listResult = await listFields(tableId);
      if (listResult.code === 0) {
        existingFields = (listResult.data.items || []).map(f => f.field_name);
        console.log(`  已有 ${existingFields.length} 个字段`);
      } else {
        console.log(`  列出字段失败: ${listResult.msg}`);
      }
    } catch(e) {
      console.log(`  列出字段异常: ${e.message}`);
    }

    for (const field of fields) {
      if (existingFields.includes(field.field_name)) {
        console.log(`  [跳过] ${field.field_name} 已存在`);
        continue;
      }
      try {
        const result = await addField(tableId, field.field_name, field.type, field.options);
        if (result.code === 0) {
          console.log(`  [新增] ${field.field_name} (type=${field.type})`);
        } else {
          console.log(`  [失败] ${field.field_name}: ${result.msg}`);
        }
      } catch(e) {
        console.log(`  [异常] ${field.field_name}: ${e.message}`);
      }
      // 避免请求过快
      await new Promise(r => setTimeout(r, 300));
    }
    console.log();
  }

  console.log('=== 完成 ===');
}

main().catch(e => { console.error(e); process.exit(1); });
