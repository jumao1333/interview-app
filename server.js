/**
 * 岗位提效采访系统 - Node.js 后端
 * Express + 飞书多维表格 API
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ============================================================
// Feishu Configuration
// ============================================================
const FEISHU_APP_ID = "cli_aaaf92c5f3bb1cbc";
const FEISHU_APP_SECRET = "C9p9SbxtK3ALcUCYdbaJIgmioB0QfIMj";
const FEISHU_BASE_TOKEN = "SIAAbq5X4acWPys8rRUcj9ZYnjd";

const TABLES = {
  content_leader: { name: "内容负责人/管理层", table_id: "tbl1v3vEIITS6NxL" },
  content_editor: { name: "内容编导", table_id: "tbl8NNSNiw2ZWXYF" },
  broker_leader: { name: "经纪负责人/管理层", table_id: "tblxmIJ6N44chyYR" },
  broker: { name: "经纪", table_id: "tblMF5VM45WxKjZq" },
};

// Question definitions with Feishu field mappings
const QDATA = {
  content_leader: [
    {id:"q1",type:"select",field_select:"Q1-最重要的结果",field_note:"Q1-补充说明"},
    {id:"q2",type:"select",field_select:"Q2-脚本外最想让AI解决什么",field_note:"Q2-补充说明"},
    {id:"q3",type:"select",field_select:"Q3-团队最反复出现的问题",field_note:"Q3-补充说明"},
    {id:"q4",type:"text",field_text:"Q4-脚本不差但效果不好的案例"},
    {id:"q5",type:"text",field_text:"Q5-判断账号变好的关键标准"},
    {id:"q6",type:"select",field_select:"Q6-已有提效方法",field_note:"Q6-补充说明"},
    {id:"q7",type:"select",field_select:"Q7-下周验证的小提效动作",field_note:"Q7-补充说明"},
    {id:"q8",type:"select",field_select:"Q8-最希望编导补充的信息",field_note:"Q8-补充说明"},
  ],
  content_editor: [
    {id:"q1",type:"select",field_select:"Q1-每周最花时间",field_note:"Q1-补充说明"},
    {id:"q2",type:"text",field_text:"Q2-最近耗时内容案例"},
    {id:"q3",type:"select",field_select:"Q3-最常返工",field_note:"Q3-补充说明"},
    {id:"q4",type:"text",field_text:"Q4-返工最多案例"},
    {id:"q5",type:"select",field_select:"Q5-AI脚本不好用在哪",field_note:"Q5-补充说明"},
    {id:"q6",type:"select",field_select:"Q6-AI写准脚本最缺什么输入",field_note:"Q6-补充说明"},
    {id:"q7",type:"text",field_text:"Q7-AI脚本不好用案例"},
    {id:"q8",type:"text",field_text:"Q8-AI脚本帮到你的案例"},
    {id:"q9",type:"select",field_select:"Q9-判断脚本能不能拍最看什么",field_note:"Q9-补充说明"},
    {id:"q10",type:"select",field_select:"Q10-拍摄现场最容易出问题",field_note:"Q10-补充说明"},
    {id:"q11",type:"select",field_select:"Q11-跟后期最说不清",field_note:"Q11-补充说明"},
    {id:"q12",type:"select",field_select:"Q12-AI先帮你省一个动作",field_note:"Q12-补充说明"},
    {id:"q13",type:"select",field_select:"Q13-最希望负责人支持",field_note:"Q13-补充说明"},
    {id:"q14",type:"text",field_text:"Q14-希望负责人知道但不一定说的"},
  ],
  broker_leader: [
    {id:"q1",type:"select",field_select:"Q1-最重要的结果",field_note:"Q1-补充说明"},
    {id:"q2",type:"text",field_text:"Q2-每月签约数量"},
    {id:"q3",type:"select",field_select:"Q3-签约最卡在哪一步",field_note:"Q3-补充说明"},
    {id:"q4",type:"select",field_select:"Q4-达人长期值得签的标准",field_note:"Q4-补充说明"},
    {id:"q5",type:"text",field_text:"Q5-50分成被拒原话"},
    {id:"q6",type:"text",field_text:"Q6-差点签成但失败案例"},
    {id:"q7",type:"text",field_text:"Q7-签得顺的案例"},
    {id:"q8",type:"select",field_select:"Q8-现有评分表话术模板",field_note:"Q8-补充说明"},
    {id:"q9",type:"select",field_select:"Q9-下周验证签约提效动作",field_note:"Q9-补充说明"},
  ],
  broker: [
    {id:"q1",type:"select",field_select:"Q1-每周最花时间",field_note:"Q1-补充说明"},
    {id:"q2",type:"select",field_select:"Q2-签约最卡在哪一步",field_note:"Q2-补充说明"},
    {id:"q3",type:"text",field_text:"Q3-值得签但没签下案例"},
    {id:"q4",type:"text",field_text:"Q4-拒绝50分成原话"},
    {id:"q5",type:"text",field_text:"Q5-沟通顺的案例"},
    {id:"q6",type:"select",field_select:"Q6-AI先帮你省一个动作",field_note:"Q6-补充说明"},
    {id:"q7",type:"select",field_select:"Q7-判断达人值得聊的标准",field_note:"Q7-补充说明"},
    {id:"q8",type:"select",field_select:"Q8-最希望负责人支持",field_note:"Q8-补充说明"},
  ],
};

// Token cache
let tokenCache = { token: null, expiresAt: 0 };

// ============================================================
// Feishu API helpers
// ============================================================
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

// ============================================================
// Build Feishu fields from answers
// ============================================================
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

// ============================================================
// HTTP Server
// ============================================================
const PORT = process.env.PORT || 8080;
const HTML_PATH = path.join(__dirname, 'standalone.html');

function serveStatic(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
    res.end(content);
  } catch(e) { res.writeHead(404); res.end('Not found'); }
}

function jsonResponse(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    return getTenantToken()
      .then(() => jsonResponse(res, 200, { status: 'ok', feishu_connected: true }))
      .catch(() => jsonResponse(res, 200, { status: 'ok', feishu_connected: false }));
  }

  if (pathname === '/api/submit' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    return req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { role, name, position, answers } = payload;
        if (!role || !TABLES[role]) return jsonResponse(res, 400, { error: 'Invalid role' });

        const fields = buildFields(role, name, position, answers || {});
        writeToFeishu(role, fields)
          .then(result => {
            if (result.code === 0) jsonResponse(res, 200, { success: true, record_id: result.data?.record?.record_id || 'ok' });
            else { console.error('[FEISHU]', JSON.stringify(result)); jsonResponse(res, 500, { error: result.msg }); }
          })
          .catch(e => { console.error(e); jsonResponse(res, 500, { error: e.message }); });
      } catch(e) { jsonResponse(res, 400, { error: e.message }); }
    });
  }

  if (pathname === '/' || pathname === '/index.html' || pathname === '/standalone.html') {
    return serveStatic(res, HTML_PATH, 'text/html; charset=utf-8');
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => console.log('Interview server on port ' + PORT));
