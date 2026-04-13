#!/usr/bin/env node
/**
 * Step 1: Narration Script Generation
 *
 * Calls MiniMax LLM to produce a natural, conversational voiceover script
 * (150-200 chars zh / 50-80 words en) for every scene produced by Step 0.
 *
 * Input:
 *   { "scenes": "<path|array>", "output_dir": "./project", "language": "zh" }
 *   (scenes can also be auto-loaded from output_dir/scenes.json)
 *
 * Output:
 *   scenes.json (same file, each scene gains a `script` field)
 */

const fs   = require('fs');
const path = require('path');
const { ensureDir, writeResult } = require('./utils/step-utils');
const { callMiniMaxJson, JSON_SYSTEM_PROMPT } = require('./utils/minimax_utils');

// Load .env from project root if env vars not already set
(function loadEnv() {
  const envFile = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim();
    if (k && v && !process.env[k]) process.env[k] = v;
  }
})();

// ─── Scene → content summary helper ───────────────────────────────────────────

function summarizeScene(scene) {
  const parts = [];
  if (scene.eyebrow) parts.push(`[${scene.eyebrow}]`);
  parts.push(`标题：${scene.title}`);
  if (scene.secondary) parts.push(`副标题：${scene.secondary}`);

  const cv = scene.content_variant;
  if (cv === 'panel' || cv === 'two_col') {
    if (Array.isArray(scene.key_points) && scene.key_points.length) {
      parts.push(`要点：${scene.key_points.join('；')}`);
    }
    if (scene.left_body) parts.push(`正文：${scene.left_body}`);
  } else if (cv === 'stats_grid') {
    if (Array.isArray(scene.stats) && scene.stats.length) {
      parts.push(`数据：${scene.stats.map(s => `${s.number} ${s.label}`).join('，')}`);
    }
  } else if (cv === 'timeline') {
    if (Array.isArray(scene.steps) && scene.steps.length) {
      parts.push(`步骤：${scene.steps.map(s => `${s.label}`).join(' → ')}`);
    }
  } else if (cv === 'number') {
    if (scene.big_number) parts.push(`核心数字：${scene.big_number}`);
    if (scene.body) parts.push(`说明：${scene.body}`);
  } else if (cv === 'quote') {
    if (scene.quote_body) parts.push(`引用：「${scene.quote_body}」`);
    if (scene.quote_source) parts.push(`来源：${scene.quote_source}`);
  } else if (cv === 'text') {
    if (scene.body) parts.push(`正文：${String(scene.body).slice(0, 300)}`);
  } else if (cv === 'code') {
    if (scene.code_label) parts.push(`代码主题：${scene.code_label}`);
  } else if (cv === 'table') {
    parts.push('包含表格数据');
  }

  // Fallback: plain body array (old format or text variant without explicit content_variant)
  if (Array.isArray(scene.body) && scene.body.length > 0) {
    parts.push(`内容：${scene.body.join('；')}`);
  } else if (typeof scene.body === 'string' && scene.body) {
    parts.push(`内容：${scene.body.slice(0, 300)}`);
  }

  if (scene.script_hint) parts.push(`旁白提示：${scene.script_hint}`);
  return parts.join('\n');
}

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(scenes, language) {
  const isZh = language !== 'en';
  const lengthGuide = isZh
    ? '每条逐字稿 150-200 个汉字，自然口语化，无标点堆砌'
    : '50-80 words each, conversational tone, no bullet-speak';
  const langNote = isZh ? '使用中文' : 'Use English';

  const sceneList = scenes.map((s, i) => {
    const typeLabel = s.type === 'cover' ? '封面页' : s.type === 'summary' ? '总结页' : `内容页（${s.content_variant || 'text'}）`;
    return `--- Scene ${i + 1} [${typeLabel}] ---\n${summarizeScene(s)}`;
  }).join('\n\n');

  return `你是一位专业的视频演讲稿撰写人。根据以下幻灯片内容，为每一页生成播音员口播逐字稿。

要求：
- ${lengthGuide}
- ${langNote}
- 封面页：简短开场，1-2句，点明主题
- 内容页：用自然语言串联要点，不要逐字念 bullet point
- 总结页：简短收尾，有力呼吁或总结金句
- 不要使用"首先""其次""最后"等机械词
- 直接以播出文字作答，不加任何前缀
- 只输出 JSON：不要 markdown 围栏，不要在 JSON 前后写说明

请返回一个 JSON 数组，格式如下：
[
  { "id": 1, "script": "..." },
  { "id": 2, "script": "..." },
  ...
]

幻灯片内容如下：

${sceneList}`;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  try {
    const params = JSON.parse(input);
    const { output_dir = './project', language = 'zh' } = params;
    let { scenes } = params;

    const outputPath = path.resolve(output_dir);

    // Resolve scenes: param → scenes.json → project.json
    if (!scenes) {
      const scenesFile  = path.join(outputPath, 'scenes.json');
      const projectFile = path.join(outputPath, 'project.json');
      if (fs.existsSync(scenesFile)) {
        scenes = scenesFile;
      } else if (fs.existsSync(projectFile)) {
        const proj = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
        scenes = proj.scenes;
      }
    }

    if (typeof scenes === 'string') {
      scenes = JSON.parse(fs.readFileSync(scenes, 'utf8'));
    }
    if (!Array.isArray(scenes) || scenes.length === 0) {
      throw new Error('No valid scenes found. Run step0 first or pass scenes explicitly.');
    }

    process.stderr.write(`📝 Step 1: generating scripts for ${scenes.length} scenes (lang=${language})…\n`);

    const prompt = buildPrompt(scenes, language);
    const scripts = await callMiniMaxJson(
      [
        { role: 'system', content: JSON_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      { maxTokens: 4000, temperature: 0.7 },
    );

    if (!Array.isArray(scripts)) throw new Error('Expected JSON array from MiniMax');

    // Merge scripts into scenes
    const scriptMap = {};
    scripts.forEach(s => { scriptMap[s.id] = s.script; });

    scenes.forEach(scene => {
      const script = scriptMap[scene.id];
      if (script) {
        scene.script = script;
      } else {
        // Fallback: minimal script so TTS doesn't break
        scene.script = scene.title || '';
        process.stderr.write(`⚠️  No script returned for scene ${scene.id}, using title as fallback\n`);
      }
    });

    process.stderr.write(`✅ Scripts generated for ${scenes.length} scenes\n`);

    // Write updated scenes.json
    ensureDir(outputPath);
    const scenesFile = path.join(outputPath, 'scenes.json');
    fs.writeFileSync(scenesFile, JSON.stringify(scenes, null, 2));

    // Also update project.json if it exists
    const projectFile = path.join(outputPath, 'project.json');
    if (fs.existsSync(projectFile)) {
      const proj = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
      proj.scenes = scenes;
      fs.writeFileSync(projectFile, JSON.stringify(proj, null, 2));
    }

    writeResult({
      success: true,
      step: 'step1',
      scenes_count: scenes.length,
      outputs: [scenesFile],
      message: `Generated narration scripts for ${scenes.length} scenes`
    });

  } catch (err) {
    process.stderr.write(`❌ Step 1 failed: ${err.message}\n`);
    if (process.env.DEBUG) process.stderr.write(err.stack + '\n');
    process.exit(1);
  }
});
