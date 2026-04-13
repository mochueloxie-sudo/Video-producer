'use strict';

/**
 * OpenAI Chat Completions 兼容 HTTP — L2 重试 + L1 从模型文本中抽取 JSON。
 * Step0 / Step1 统一经此模块调用。
 *
 * 环境变量（建议 MiniMax：优先 MINIMAX_*；若无再填 LLM_* 使用其它兼容端点）：
 *   MINIMAX_API_KEY / LLM_API_KEY
 *   MINIMAX_BASE_URL / LLM_BASE_URL（默认 MiniMax 官方根）
 *   MINIMAX_MODEL / LLM_MODEL
 */

const https = require('https');

const DEFAULT_BASE_FALLBACK = 'https://api.minimax.chat/v1';
const DEFAULT_MODEL_FALLBACK = 'MiniMax-M2.7-highspeed';

function getLlmBaseUrl() {
  const raw = process.env.MINIMAX_BASE_URL || process.env.LLM_BASE_URL || DEFAULT_BASE_FALLBACK;
  return String(raw).replace(/\/+$/, '');
}

function getLlmModel() {
  return process.env.MINIMAX_MODEL || process.env.LLM_MODEL || DEFAULT_MODEL_FALLBACK;
}

function getLlmApiKey() {
  const k = process.env.MINIMAX_API_KEY || process.env.LLM_API_KEY;
  return k && String(k).trim() ? String(k).trim() : null;
}

/** @returns {{ apiKey: string|null, baseUrl: string, model: string }} */
function getLlmConfig() {
  return {
    apiKey: getLlmApiKey(),
    baseUrl: getLlmBaseUrl(),
    model: getLlmModel(),
  };
}

/** L3：与 user prompt 配套的 system 约束（只输出 JSON） */
const JSON_SYSTEM_PROMPT =
  'You must respond with ONLY valid JSON: a single JSON array or a single JSON object. ' +
  'Do not use markdown code fences (no ```). Do not write any explanatory text before or after the JSON.';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function stripFences(text) {
  return String(text)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

/**
 * L1：从模型输出中截取第一段括号配平的 JSON（object 或 array），忽略前后杂音。
 */
function extractJsonSubstring(text) {
  const s = String(text).trim();
  const iObj = s.indexOf('{');
  const iArr = s.indexOf('[');
  let start = -1;
  let openCh = '';
  let closeCh = '';
  if (iObj >= 0 && (iArr < 0 || iObj <= iArr)) {
    start = iObj;
    openCh = '{';
    closeCh = '}';
  } else if (iArr >= 0) {
    start = iArr;
    openCh = '[';
    closeCh = ']';
  } else {
    return null;
  }
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = start; j < s.length; j++) {
    const c = s[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === openCh) depth++;
    else if (c === closeCh) {
      depth--;
      if (depth === 0) return s.slice(start, j + 1);
    }
  }
  return null;
}

/**
 * L1：整段 strip → parse；失败则括号抽取后再 parse。
 */
function parseJsonFromModelText(text) {
  const stripped = stripFences(text);
  try {
    return JSON.parse(stripped);
  } catch (_) {
    const frag = extractJsonSubstring(text);
    if (!frag) throw new Error('No JSON object/array found in model output');
    return JSON.parse(frag);
  }
}

function shouldRetryMiniMaxError(err) {
  const msg = String(err && err.message ? err.message : err);
  const code = err && err.code;
  const status = err && err.statusCode;
  if (status === 429 || (status >= 500 && status < 600)) return true;
  if (/^(MiniMax|LLM) HTTP (429|5\d\d)/.test(msg)) return true;
  if (/ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket/i.test(msg)) return true;
  if (/(MiniMax|LLM) error|empty content|HTTP body parse failed/i.test(msg)) return true;
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT') return true;
  return false;
}

async function minimaxRawRequest(bodyObj, apiKey, baseUrl) {
  const body = JSON.stringify(bodyObj);
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/chat/completions`);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      res => {
        let data = '';
        res.on('data', c => {
          data += c;
        });
        res.on('end', () => {
          if (res.statusCode === 429 || res.statusCode >= 500) {
            const e = new Error(`LLM HTTP ${res.statusCode}: ${data.slice(0, 200)}`);
            e.statusCode = res.statusCode;
            return reject(e);
          }
          try {
            const json = JSON.parse(data);
            if (json.error) {
              return reject(
                new Error(`LLM error: ${json.error.message || JSON.stringify(json.error)}`),
              );
            }
            const text = json.choices?.[0]?.message?.content;
            if (text == null || text === '') {
              return reject(new Error(`LLM empty content: ${data.slice(0, 300)}`));
            }
            resolve(String(text));
          } catch (e) {
            reject(new Error(`LLM HTTP body parse failed: ${data.slice(0, 300)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * L2：指数退避重试；成功返回 assistant 文本（不含 API 外壳）。
 */
async function callMiniMaxMessages(messages, { maxTokens, temperature, retries = 3 } = {}) {
  const { apiKey, baseUrl, model } = getLlmConfig();
  if (!apiKey) {
    throw new Error(
      'LLM API key missing: set MINIMAX_API_KEY (recommended MiniMax) or LLM_* for another OpenAI-compatible provider; include matching BASE_URL and MODEL. See .env.example.',
    );
  }
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await minimaxRawRequest(
        {
          model,
          messages,
          max_tokens: maxTokens,
          temperature: temperature ?? 0.3,
        },
        apiKey,
        baseUrl,
      );
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !shouldRetryMiniMaxError(err)) throw err;
      await sleep(attempt * 2000);
    }
  }
  throw lastErr;
}

/**
 * 调用模型并解析 JSON；若解析失败则重新请求（parseRetries），每次请求内部仍有 HTTP 层重试。
 */
async function callMiniMaxJson(
  messages,
  { maxTokens, temperature, httpRetries = 3, parseRetries = 3 } = {},
) {
  let lastErr;
  for (let attempt = 1; attempt <= parseRetries; attempt++) {
    try {
      const raw = await callMiniMaxMessages(messages, {
        maxTokens,
        temperature,
        retries: httpRetries,
      });
      return parseJsonFromModelText(raw);
    } catch (err) {
      lastErr = err;
      if (attempt === parseRetries) throw err;
      await sleep(attempt * 2000);
    }
  }
  throw lastErr;
}

module.exports = {
  JSON_SYSTEM_PROMPT,
  stripFences,
  extractJsonSubstring,
  parseJsonFromModelText,
  callMiniMaxMessages,
  callMiniMaxJson,
  sleep,
  getLlmConfig,
};
