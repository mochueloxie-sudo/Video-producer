// LLM client — OpenAI Chat Completions 兼容 HTTP（历史兼容入口）
// Step0 / Step1 已统一走 minimax_utils.js；新代码请 require('./minimax_utils')

const https = require('https');
const { getLlmConfig } = require('./minimax_utils');

/**
 * 调用 Chat Completions API（LLM_* 或 MINIMAX_* 环境变量）
 * @param {Object} params - { messages, model, temperature, ... }
 * @param {number} retries
 */
async function callMiniMax(params, retries = 3) {
  const { apiKey, baseUrl, model } = getLlmConfig();
  if (!apiKey) throw new Error('Set MINIMAX_API_KEY (recommended) or LLM_API_KEY; see .env.example');

  const body = JSON.stringify({ model, ...params });
  const url = new URL(`${baseUrl}/chat/completions`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const text = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: url.hostname,
          path:     url.pathname + url.search,
          method:   'POST',
          headers:  {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
        }, res => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });

      const json = JSON.parse(text);
      if (json.error) throw new Error(JSON.stringify(json.error));
      return json;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
}

module.exports = { callMiniMax };
