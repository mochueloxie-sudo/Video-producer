/**
 * Shared utilities for slide-forge steps
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * 解析输入参数（支持文件路径或直接对象）
 */
function parseParam(value, defaultValue = {}) {
  if (!value) return defaultValue;
  if (typeof value === 'string') {
    try {
      return JSON.parse(fs.readFileSync(value, 'utf-8'));
    } catch (e) {
      console.error(`⚠️ 无法解析参数: ${value}, 使用默认值`);
      return defaultValue;
    }
  }
  return value;
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 执行命令（统一错误处理）
 */
async function execCommand(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });

    let stdout = '', stderr = '';
    if (!options.silent) {
      proc.stdout.pipe(process.stdout);
      proc.stderr.pipe(process.stderr);
    } else {
      proc.stdout.on('data', d => stdout += d);
      proc.stderr.on('data', d => stderr += d);
    }

    proc.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(`${cmd} exited with ${code}: ${stderr}`);
        err.code = code;
        reject(err);
      }
    });

    proc.on('error', reject);
  });
}

/**
 * 写入 JSON 结果（标准格式）
 */
function writeResult(options) {
  const { success, step, outputs, message, metadata = {} } = options;
  const result = {
    success,
    step,
    outputs: Array.isArray(outputs) ? outputs : [outputs],
    message,
    ...metadata
  };
  console.log(JSON.stringify(result, null, 2));
}

/**
 * 验证必需字段
 */
function validateParams(params, requiredFields) {
  const missing = requiredFields.filter(f => !(f in params));
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

module.exports = {
  parseParam,
  ensureDir,
  execCommand,
  writeResult,
  validateParams
};
