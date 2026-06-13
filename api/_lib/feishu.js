/**
 * 飞书 API 共享模块 - Vercel Serverless
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

const QDATA = {
  // v4: +失误反演 + 数字锚点
  content_leader: [
    {id:"q1",type:"select",field_select:"Q1-最重要的结果",field_note:"Q1-补充说明"},
    {id:"q2",type:"select",field_select:"Q2-脚本外最想让AI解决什么",field_note:"Q2-补充说明"},
    {id:"q3",type:"select",field_select:"Q3-团队最反复出现的问题",field_note:"Q3-补充说明"},
    {id:"qh1",type:"select",field_select:"QH1-取舍提效环节",field_note:"QH1-取舍理由"},
    {id:"qh2",type:"text",field_text:"QH2-反证最大卡点"},
    {id:"qh3",type:"text",field_text:"QH3-新人独立标准"},
    {id:"qh4",type:"text",field_text:"QH4-可复制标准"},
    {id:"qh5",type:"text",field_text:"QH5-沉淀3个判断"},
    {id:"q6",type:"select",field_select:"Q6-已有提效方法",field_note:"Q6-补充说明"},
    {id:"q7",type:"select",field_select:"Q7-下周验证的小提效动作",field_note:"Q7-补充说明"},
    {id:"q8",type:"select",field_select:"Q8-最希望编导补充的信息",field_note:"Q8-补充说明"},
    {id:"qh6",type:"text",field_text:"QH6-失误反演"},
    {id:"q9",type:"text",field_text:"Q9-核心数字基线"},
    {id:"q10",type:"text",field_text:"Q10-上周重复沟通时间占比"},
  ],
  // v4: q5合并案例 + 加失误反演 + 数字锚点
  content_editor: [
    {id:"q1",type:"select",field_select:"Q1-每周最花时间",field_note:"Q1-补充说明"},
    {id:"q2",type:"text",field_text:"Q2-最近耗时内容案例"},
    {id:"q3",type:"select",field_select:"Q3-最常返工",field_note:"Q3-补充说明"},
    {id:"q4",type:"text",field_text:"Q4-返工最多案例"},
    {id:"q5",type:"select",field_select:"Q5-AI脚本不好用在哪",field_note:"Q5-案例说明v4"},
    {id:"q6",type:"text",field_text:"Q8-AI脚本帮到你的案例"},
    {id:"qh1",type:"text",field_text:"QH1-AI脚本手改3处"},
    {id:"qh2",type:"select",field_select:"QH2-AI最易写错内容v3",field_note:"QH2-写错原因v3"},
    {id:"qh3",type:"select",field_select:"QH3-拍摄前检查5项",field_note:"QH3-检查原因"},
    {id:"q7",type:"select",field_select:"Q9-判断脚本能不能拍最看什么",field_note:"Q9-补充说明"},
    {id:"q8",type:"select",field_select:"Q10-拍摄与后期最易出问题v3",field_note:"Q10-补充说明v3"},
    {id:"q9",type:"select",field_select:"Q12-AI先帮你省一个动作",field_note:"Q12-补充说明"},
    {id:"q10",type:"select",field_select:"Q13-最希望负责人支持",field_note:"Q13-补充说明"},
    {id:"qh4",type:"text",field_text:"QH4-失误反演"},
    {id:"q11",type:"text",field_text:"Q11-上周工作时长分布"},
    {id:"q12",type:"text",field_text:"Q12-上月产出及返工"},
  ],
  // v4: 换 q8/q9 + 加扩编题 + 失误反演 + 数字锚点
  broker_leader: [
    {id:"qh1",type:"text",field_text:"QH1-签约判断路径"},
    {id:"qh2",type:"text",field_text:"QH2-不建议签的达人"},
    {id:"qh3",type:"select",field_select:"QH3-50分成本质拒绝",field_note:"QH3-50分成理由"},
    {id:"qh4",type:"select",field_select:"QH4-AI初筛8信息v3",field_note:"QH4-初筛关键前三v3"},
    {id:"qh5",type:"text",field_text:"QH5-成交利益判断"},
    {id:"q1",type:"select",field_select:"Q1-最重要的结果",field_note:"Q1-补充说明"},
    {id:"q3",type:"select",field_select:"Q3-签约最卡在哪一步",field_note:"Q3-补充说明"},
    {id:"q4",type:"select",field_select:"Q4-达人长期值得签的标准",field_note:"Q4-补充说明"},
    {id:"q8",type:"text",field_text:"Q8-v4-团队判断差距"},
    {id:"q9",type:"text",field_text:"Q9-v4-50分成让步边界"},
    {id:"q10",type:"text",field_text:"Q10-v4-核心数字基线"},
    {id:"q11",type:"text",field_text:"Q11-v4-扩编vs提质量"},
    {id:"qh6",type:"text",field_text:"QH6-失误反演"},
    {id:"q12",type:"text",field_text:"Q12-v4-上周推进卡住时间占比"},
  ],
  // v4: +失误反演 + 数字锚点
  broker: [
    {id:"q1",type:"select",field_select:"Q1-每周最花时间",field_note:"Q1-补充说明"},
    {id:"q2",type:"select",field_select:"Q2-签约最卡在哪一步",field_note:"Q2-补充说明"},
    {id:"qh1",type:"select",field_select:"QH1-值得聊的信号v3",field_note:"QH1-信号案例v3"},
    {id:"qh2",type:"text",field_text:"QH2-拒绝挽回与放弃"},
    {id:"qh3",type:"select",field_select:"QH3-最卡话术类型",field_note:"QH3-卡住的原话"},
    {id:"q3",type:"text",field_text:"Q3-值得签但没签下案例"},
    {id:"q4",type:"text",field_text:"Q4-拒绝50分成原话"},
    {id:"q5",type:"text",field_text:"Q5-沟通顺的案例"},
    {id:"q6",type:"select",field_select:"Q6-AI先帮你省一个动作",field_note:"Q6-补充说明"},
    {id:"q7",type:"select",field_select:"Q7-判断达人值得聊的标准",field_note:"Q7-补充说明"},
    {id:"q8",type:"select",field_select:"Q8-最希望负责人支持",field_note:"Q8-补充说明"},
    {id:"qh4",type:"text",field_text:"QH4-失误反演"},
    {id:"q9",type:"text",field_text:"Q9-上月接触深聊签约数字"},
    {id:"q10",type:"text",field_text:"Q10-上周跟进卡住时间占比"},
  ],
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

function writeToFeishu(role, fieldsData) {
  const tableId = TABLES[role].table_id;
  return feishuApi('POST', '/bitable/v1/apps/' + FEISHU_BASE_TOKEN + '/tables/' + tableId + '/records', { fields: fieldsData });
}

// 缓存每个表的字段名（用于写入前校验）
let fieldsCache = {};

function getTableFields(tableId) {
  if (fieldsCache[tableId] && Date.now() < fieldsCache[tableId].expiresAt) {
    return Promise.resolve(fieldsCache[tableId].fields);
  }
  return feishuApi('GET', '/bitable/v1/apps/' + FEISHU_BASE_TOKEN + '/tables/' + tableId + '/fields').then(r => {
    if (r.code !== 0) return null;
    const names = new Set(r.data.items.map(f => f.field_name));
    fieldsCache[tableId] = { fields: names, expiresAt: Date.now() + 3600000 }; // 1小时缓存
    return names;
  }).catch(() => null);
}

function buildFields(role, name, position, answers) {
  const fields = {
    '姓名': name,
    '所属岗位': position,
    '填写日期': Date.now(),
  };
  const questions = QDATA[role] || [];
  for (const q of questions) {
    const answer = answers[q.id];
    if (!answer) continue;
    if (q.type === 'select') {
      const selected = answer.selected;
      if (selected && selected.length > 0) {
        fields[q.field_select] = Array.isArray(selected) ? selected : [selected];
      }
      const note = answer.note;
      if (note && q.field_note) {
        fields[q.field_note] = note;
      }
    } else if (q.type === 'text') {
      const text = typeof answer === 'string' ? answer : (answer.text || '');
      if (text && q.field_text) {
        fields[q.field_text] = text;
      }
    }
  }
  return fields;
}

// 写入前过滤掉不存在的字段名
async function safeWriteToFeishu(role, fieldsData) {
  const tableId = TABLES[role].table_id;
  const existingFields = await getTableFields(tableId);
  if (existingFields) {
    // 只保留飞书表中实际存在的字段
    const filtered = {};
    for (const [k, v] of Object.entries(fieldsData)) {
      if (existingFields.has(k)) {
        filtered[k] = v;
      } else {
        console.warn(`[SKIP] Field not found in Feishu: ${k}`);
      }
    }
    return writeToFeishu(role, filtered);
  }
  // 如果查不到字段列表，直接写（兜底）
  return writeToFeishu(role, fieldsData);
}

module.exports = { TABLES, getTenantToken, writeToFeishu, buildFields, safeWriteToFeishu };
