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
  // v3: 5道高阶判断题 + 基础锚点 + 落地
  content_leader: [
    {id:"q1",type:"select",field_select:"Q1-最重要的结果",field_note:"Q1-补充说明"},
    {id:"q2",type:"select",field_select:"Q2-脚本外最想让AI解决什么",field_note:"Q2-补充说明"},
    {id:"q3",type:"select",field_select:"Q3-团队最反复出现的问题",field_note:"Q3-补充说明"},
    {id:"qh1",type:"select",field_select:"QH1-取舍提效环节",field_note:"QH1-取舍理由"},
    {id:"qh2",type:"text",field_text:"QH2-证据判断"},
    {id:"qh3",type:"text",field_text:"QH3-反证判断"},
    {id:"qh4",type:"text",field_text:"QH4-可复制标准"},
    {id:"qh5",type:"text",field_text:"QH5-AI沉淀优先级"},
    {id:"q6",type:"select",field_select:"Q6-已有提效方法",field_note:"Q6-补充说明"},
    {id:"q7",type:"select",field_select:"Q7-下周验证的小提效动作",field_note:"Q7-补充说明"},
    {id:"q8",type:"select",field_select:"Q8-最希望编导补充的信息",field_note:"Q8-补充说明"},
  ],
  // v3: 合并 q5+q6, q10+q11→q9, 偏移题号对齐旧字段, qh2改为select, 新增qh3
  content_editor: [
    {id:"q1",type:"select",field_select:"Q1-每周最花时间",field_note:"Q1-补充说明"},
    {id:"q2",type:"text",field_text:"Q2-最近耗时内容案例"},
    {id:"q3",type:"select",field_select:"Q3-最常返工",field_note:"Q3-补充说明"},
    {id:"q4",type:"text",field_text:"Q4-返工最多案例"},
    {id:"q5",type:"select",field_select:"Q5-AI脚本不好用在哪",field_note:"Q5-补充说明"},
    {id:"q6",type:"text",field_text:"Q7-AI脚本不好用案例"},
    {id:"q7",type:"text",field_text:"Q8-AI脚本帮到你的案例"},
    {id:"qh1",type:"text",field_text:"QH1-AI脚本手改3处"},
    {id:"qh2",type:"select",field_select:"QH2-AI最易写错内容v3",field_note:"QH2-写错原因v3"},
    {id:"qh3",type:"select",field_select:"QH3-拍摄前检查5项",field_note:"QH3-检查原因"},
    {id:"q8",type:"select",field_select:"Q9-判断脚本能不能拍最看什么",field_note:"Q9-补充说明"},
    {id:"q9",type:"select",field_select:"Q10-拍摄与后期最易出问题v3",field_note:"Q10-补充说明v3"},
    {id:"q10",type:"select",field_select:"Q12-AI先帮你省一个动作",field_note:"Q12-补充说明"},
    {id:"q11",type:"select",field_select:"Q13-最希望负责人支持",field_note:"Q13-补充说明"},
    {id:"q12",type:"text",field_text:"Q14-希望负责人知道但不一定说的"},
  ],
  // v3: qh4改为select, 细化所有qh题目
  broker_leader: [
    {id:"qh1",type:"text",field_text:"QH1-签约判断路径"},
    {id:"qh2",type:"text",field_text:"QH2-不建议签的达人"},
    {id:"qh3",type:"select",field_select:"QH3-50分成本质拒绝",field_note:"QH3-50分成理由"},
    {id:"qh4",type:"select",field_select:"QH4-AI初筛8信息v3",field_note:"QH4-初筛关键前三v3"},
    {id:"qh5",type:"text",field_text:"QH5-成交利益判断"},
    {id:"q1",type:"select",field_select:"Q1-最重要的结果",field_note:"Q1-补充说明"},
    {id:"q3",type:"select",field_select:"Q3-签约最卡在哪一步",field_note:"Q3-补充说明"},
    {id:"q4",type:"select",field_select:"Q4-达人长期值得签的标准",field_note:"Q4-补充说明"},
    {id:"q8",type:"select",field_select:"Q8-现有评分表话术模板",field_note:"Q8-补充说明"},
    {id:"q9",type:"select",field_select:"Q9-下周验证签约提效动作",field_note:"Q9-补充说明"},
  ],
  // v3: qh1改为select, 新增qh3话术卡点
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
      if (selected) {
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

module.exports = { TABLES, getTenantToken, writeToFeishu, buildFields };
