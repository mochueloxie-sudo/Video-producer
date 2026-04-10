#!/usr/bin/env node
/**
 * slide-forge skill (Lightweight v2.0)
 * 8个独立Step，自由组合，无锁死流水线
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Load .env file (if present) into process.env
(function loadEnv() {
  const envFile = path.join(__dirname, '.env');
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && val && !process.env[key]) process.env[key] = val;
  }
})();

async function main() {
  let input = '';
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', async () => {
    try {
      const params = JSON.parse(input);
      const { command } = params;

      console.log(`🎬 slide-forge: executing command="${command}"`);

      let result;
      switch (command) {
        case 'step0':
          result = await step0_analyze(params);
          break;
        case 'step1':
          result = await step1_script(params);
          break;
        case 'step2':
          result = await step2_design(params);
          break;
        case 'step3':
          result = await step3_html(params);
          break;
        case 'step4':
          result = await step4_screenshot(params);
          break;
        case 'step5':
          result = await step5_tts(params);
          break;
        case 'step6':
          result = await step6_format(params);
          break;
        case 'step7':
          result = await step7_channel(params);
          break;
        case 'all':
          result = await run_all(params);
          break;
        default:
          throw new Error(`Unknown command: ${command}`);
      }

      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('❌ Error:', err.message);
      console.error(err.stack);
      process.exit(1);
    }
  });
}

// ============================================
// Step 0-7: 统一转发到 steps/*.js
// ============================================

// 参数标准化：统一 executor 外部名 → step 内部名
function normalizeParams(params, stepName) {
  const p = { ...params };
  // projectDir / output_dir
  if (p.projectDir && !p.output_dir) p.output_dir = p.projectDir;
  // designMode / design_mode
  if (p.designMode && !p.design_mode) p.design_mode = p.designMode;
  // docUrl / doc_url
  if (p.docUrl && !p.doc_url) p.doc_url = p.docUrl;
  return p;
}

async function step0_analyze(params) {
  return runStepScript('step0_analyze.js', normalizeParams(params, 'step0'));
}

async function step1_script(params) {
  return runStepScript('step1_script.js', normalizeParams(params, 'step1'));
}

async function step2_design(params) {
  return runStepScript('step2_design.js', normalizeParams(params, 'step2'));
}

// ============================================
// Step 3: HTML 渲染（调用独立脚本）
// ============================================
async function step3_html(params) {
  return runStepScript('step3_html.js', normalizeParams(params, 'step3'));
}

// ============================================
// Step 4: 截图（调用现有 screenshot.js）
// ============================================
async function step4_screenshot(params) {
  return runStepScript('step4_screenshot.js', normalizeParams(params, 'step4'));
}

// ============================================
// Step 5: TTS 合成
// ============================================
async function step5_tts(params) {
  return runStepScript('step5_tts.js', normalizeParams(params, 'step5'));
}

// ============================================
// Step 6: 交付格式（video / pdf / html + outline + script）
// ============================================
async function step6_format(params) {
  return runStepScript('step6_format.js', normalizeParams(params, 'step6'));
}

// ============================================
// Step 7: 交付渠道（local / feishu）
// ============================================
async function step7_channel(params) {
  return runStepScript('step7_channel.js', normalizeParams(params, 'step7'));
}

// ============================================
// 辅助：运行所有 Steps（顺序执行）
// ============================================
async function run_all(params) {
  const results = [];

  // Step 0
  console.log("\n🔄 Step 0: 分析内容...");
  const r0 = await step0_analyze(params);
  params.scenes = r0.outputs[0];
  results.push(r0);

  // Step 1
  console.log("🔄 Step 1: 生成逐字稿...");
  const r1 = await step1_script({ ...params, scenes: params.scenes });
  params.scenes = r1.outputs[0];
  results.push(r1);

  // Step 2 — design_mode: user-specified or auto-selected inside step2
  console.log("🔄 Step 2: 生成设计参数...");
  const r2 = await step2_design({ ...params, scenes: params.scenes });
  params.design_params = r2.outputs[0];
  results.push(r2);

  // Step 3
  console.log("🔄 Step 3: 渲染 HTML...");
  const r3 = await step3_html({ ...params, scenes: params.scenes, design_params: params.design_params });
  params.html_dir = params.output_dir;
  results.push(r3);

  // Step 4
  console.log("🔄 Step 4: 截图...");
  const screenshotsDir = path.join(params.output_dir, 'screenshots');
  const r4 = await step4_screenshot({
    ...params,
    html_dir: params.html_dir,
    output_dir: screenshotsDir,
    design_params: params.design_params,
  });
  params.screenshots_dir = screenshotsDir;
  results.push(r4);

  // Step 5 (TTS — only needed if format includes video)
  const formats = Array.isArray(params.format) ? params.format : [params.format || 'video'];
  const needsAudio = formats.includes('video');

  if (needsAudio) {
    console.log("🔄 Step 5: TTS...");
    const r5 = await step5_tts({ ...params, scenes: params.scenes });
    results.push(r5);
  } else {
    console.log("⏭️  Step 5: 跳过 TTS（当前格式不需要音频）");
  }

  // Step 6: 交付格式
  console.log("🔄 Step 6: 生成交付格式...");
  const r6 = await step6_format({
    ...params,
    format: formats,
    scenes: params.scenes,
    screenshots_dir: params.screenshots_dir || path.join(params.output_dir, 'screenshots'),
    audio_dir: params.audio_dir || path.join(params.output_dir, 'audio'),
    html_dir: params.html_dir || params.output_dir,
  });
  results.push(r6);

  // Step 7: 交付渠道
  const channel = params.channel || 'local';
  console.log(`🔄 Step 7: 交付渠道 (${channel})...`);
  const r7 = await step7_channel({
    ...params,
    channel,
    scenes: params.scenes,
    video_path: formats.includes('video') ? path.join(params.output_dir, 'presentation.mp4') : undefined
  });
  results.push(r7);

  return {
    success: true,
    step: "all",
    results,
    message: `完整流程执行完毕 → 格式: ${formats.join('+')} / 渠道: ${channel}`
  };
}

async function runStepScript(scriptName, params) {
  const stepScript = path.resolve(__dirname, 'steps', scriptName);
  const { stdout } = await runCommand('node', [stepScript], { input: JSON.stringify(params) });
  return JSON.parse(stdout);
}

// ============================================
// 辅助：运行外部命令
// ============================================
function runCommand(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    if (options.input) {
      proc.stdin.write(options.input);
      proc.stdin.end();
    }
    proc.on('close', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} failed: ${stderr}`));
    });
    proc.on('error', reject);
  });
}

main();
