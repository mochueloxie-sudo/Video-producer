#!/usr/bin/env node
/**
 * Step 6: 交付格式
 *
 * 根据 format 参数生成对应的交付物：
 *   - "video" → MP4 (delegates to step6_video.js logic)
 *   - "pdf"   → PDF from screenshots
 *   - "html"  → presentation.html（主入口：iframe 单页，可重播动效 + 组件 hover）+ presentation_static.html（PNG 轮播）
 *
 * 无论选择什么格式，都自动生成：
 *   - outline.md  — 内容大纲
 *   - script.md   — 完整逐字稿
 */

const fs   = require('fs');
const path = require('path');
const { ensureDir } = require('./utils/step-utils');

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  try {
    const params = JSON.parse(input);
    const {
      format = 'video',
      scenes,
      screenshots_dir,
      audio_dir,
      html_dir,
      output_dir = './output',
      output,
      design_params
    } = params;

    const outputPath = path.resolve(output_dir);
    ensureDir(outputPath);

    const scenesData = typeof scenes === 'string'
      ? JSON.parse(fs.readFileSync(path.resolve(scenes), 'utf8'))
      : scenes;

    if (!scenesData || !Array.isArray(scenesData)) {
      throw new Error('"scenes" is required (path to scenes.json or array)');
    }

    const formats = Array.isArray(format) ? format : [format];
    const outputs = [];

    console.error('📦 Step 6: 生成交付格式');
    console.error(`   格式: ${formats.join(', ')}`);

    // ── Always: generate outline + script ─────────────────────────────────
    const outlinePath = path.join(outputPath, 'outline.md');
    const scriptPath  = path.join(outputPath, 'script.md');

    generateOutline(scenesData, outlinePath);
    generateScript(scenesData, scriptPath);
    outputs.push(outlinePath, scriptPath);
    console.error(`   ✅ outline.md + script.md`);

    // ── Format-specific outputs ───────────────────────────────────────────
    for (const fmt of formats) {
      switch (fmt) {
        case 'video': {
          const videoOut = output || path.join(outputPath, 'presentation.mp4');
          await generateVideo({
            screenshots_dir, audio_dir, design_params, scenes: scenesData, output: videoOut
          });
          outputs.push(videoOut);
          console.error(`   ✅ ${path.basename(videoOut)}`);
          break;
        }
        case 'pdf': {
          const pdfOut = path.join(outputPath, 'presentation.pdf');
          const ssDir = path.resolve(screenshots_dir || path.join(outputPath, 'screenshots'));
          await generatePDF(ssDir, scenesData, pdfOut);
          outputs.push(pdfOut);
          console.error(`   ✅ presentation.pdf`);
          break;
        }
        case 'html': {
          const ssDir = path.resolve(screenshots_dir || path.join(outputPath, 'screenshots'));
          const staticOut = path.join(outputPath, 'presentation_static.html');
          await generateHTMLPresentation(ssDir, scenesData, staticOut);
          outputs.push(staticOut);
          console.error(`   ✅ presentation_static.html（PNG 截图轮播）`);
          const htmlDirResolved = path.resolve(html_dir || outputPath);
          const liveOut = path.join(outputPath, 'presentation.html');
          const liveOk = generateHTMLPresentationLive(htmlDirResolved, scenesData, liveOut);
          if (liveOk) {
            outputs.push(liveOut);
            console.error(`   ✅ presentation.html（主入口 · iframe 单页 · 动效 + hover）`);
            const relOut = path.relative(process.cwd(), outputPath).replace(/\\/g, '/') || '.';
            console.error(`   💡 iframe 加载 page_*.html：勿用 file://（常被浏览器拦截）。在项目根执行：`);
            console.error(`      npm run preview:html -- ${relOut}`);
          }
          break;
        }
        default:
          console.error(`   ⚠️  未知格式: ${fmt}，跳过`);
      }
    }

    console.log(JSON.stringify({
      success: true,
      step: 'step6',
      outputs,
      message: `交付格式生成完成: ${formats.join(', ')} + outline + script`,
      metadata: { formats, pages: scenesData.length }
    }));
  } catch (err) {
    console.error('❌ Step 6 失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Outline generation
// ═══════════════════════════════════════════════════════════════════════════════

function generateOutline(scenes, outPath) {
  const lines = [];
  const title = scenes.find(s => s.type === 'cover')?.title || '演示大纲';

  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`> ${scenes.length} 页 · 自动生成`);
  lines.push('');
  lines.push('| 页码 | 类型 | 标题 | 变体 | 关键内容 |');
  lines.push('|------|------|------|------|---------|');

  for (const s of scenes) {
    const page = String(s.id || s.page_num || '').padStart(2, '0');
    const variant = s.content_variant || s.type || '';
    const keywords = extractKeywords(s);
    lines.push(`| ${page} | ${s.type} | ${s.title || ''} | ${variant} | ${keywords} |`);
  }

  lines.push('');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
}

function extractKeywords(scene) {
  const parts = [];
  if (scene.key_points?.length) parts.push(scene.key_points.slice(0, 3).join('、'));
  if (scene.big_number) parts.push(scene.big_number);
  if (scene.stats?.length) parts.push(scene.stats.map(s => s.label).join('、'));
  if (scene.icons?.length) parts.push(scene.icons.slice(0, 3).map(i => i.label).join('、'));
  if (scene.cards?.length) parts.push(scene.cards.slice(0, 3).map(c => c.title).join('、'));
  if (scene.steps?.length) parts.push(scene.steps.slice(0, 3).map(s => s.label).join('、'));
  if (scene.quote_body) parts.push(scene.quote_body.slice(0, 30));
  if (!parts.length && scene.subtitle) parts.push(scene.subtitle.slice(0, 40));
  return parts.join(' / ').slice(0, 60);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Script generation
// ═══════════════════════════════════════════════════════════════════════════════

function generateScript(scenes, outPath) {
  const lines = [];
  const title = scenes.find(s => s.type === 'cover')?.title || '逐字稿';

  lines.push(`# ${title} — 逐字稿`);
  lines.push('');

  for (const s of scenes) {
    const page = String(s.id || s.page_num || '').padStart(2, '0');
    lines.push(`## 第 ${page} 页：${s.title || '(无标题)'}`);
    lines.push('');
    if (s.script) {
      lines.push(s.script);
    } else if (s.script_hint) {
      lines.push(`*（提示：${s.script_hint}）*`);
    } else {
      lines.push('*（暂无逐字稿）*');
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Video format (delegates to existing step6_video logic)
// ═══════════════════════════════════════════════════════════════════════════════

async function generateVideo(params) {
  const { spawn } = require('child_process');
  const videoScript = path.resolve(__dirname, 'step6_video.js');
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [videoScript], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => { stderr += d; process.stderr.write(d); });
    proc.stdin.write(JSON.stringify(params));
    proc.stdin.end();
    proc.on('close', code => {
      if (code === 0) resolve(JSON.parse(stdout));
      else reject(new Error(`Video generation failed: ${stderr}`));
    });
    proc.on('error', reject);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF format (screenshots → single PDF)
// ═══════════════════════════════════════════════════════════════════════════════

async function generatePDF(screenshotsDir, scenes, outPath) {
  const pngFiles = fs.readdirSync(screenshotsDir)
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => path.join(screenshotsDir, f));

  if (pngFiles.length === 0) throw new Error(`No screenshots found in ${screenshotsDir}`);

  // Use Puppeteer to render a simple HTML with all images → PDF
  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch {
    throw new Error('puppeteer is required for PDF generation: npm install puppeteer');
  }

  const imgTags = pngFiles.map(f => {
    const b64 = fs.readFileSync(f).toString('base64');
    return `<div class="page"><img src="data:image/png;base64,${b64}" /></div>`;
  }).join('\n');

  const html = `<!DOCTYPE html><html><head><style>
    * { margin: 0; padding: 0; }
    @page { size: 1920px 1080px; margin: 0; }
    .page { page-break-after: always; width: 1920px; height: 1080px; }
    .page:last-child { page-break-after: auto; }
    img { width: 1920px; height: 1080px; display: block; }
  </style></head><body>${imgTags}</body></html>`;

  const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const launchOpts = { headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] };
  if (!process.env.PUPPETEER_EXECUTABLE_PATH && require('fs').existsSync(SYSTEM_CHROME)) {
    launchOpts.executablePath = SYSTEM_CHROME;
  }
  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({
    path: outPath,
    width: '1920px',
    height: '1080px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  await browser.close();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML Presentation (single-file slideshow with keyboard navigation)
// ═══════════════════════════════════════════════════════════════════════════════

async function generateHTMLPresentation(screenshotsDir, scenes, outPath) {
  const pngFiles = fs.readdirSync(screenshotsDir)
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => path.join(screenshotsDir, f));

  if (pngFiles.length === 0) throw new Error(`No screenshots found in ${screenshotsDir}`);

  const slidesData = pngFiles.map((f, i) => {
    const b64 = fs.readFileSync(f).toString('base64');
    const scene = scenes[i] || {};
    return { b64, title: scene.title || `Slide ${i + 1}`, script: scene.script || '' };
  });

  const coverTitle = scenes.find(s => s.type === 'cover')?.title || 'Presentation';

  const slidesJSON = JSON.stringify(slidesData.map(s => ({
    title: s.title,
    script: s.script
  })));

  const imgSrcList = slidesData.map(s => `"data:image/png;base64,${s.b64}"`).join(',\n    ');

  const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(coverTitle)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

  .slide-container {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .slide-img {
    max-width: 100%; max-height: 100%;
    object-fit: contain;
    transition: opacity 0.3s ease;
    user-select: none; -webkit-user-drag: none;
  }

  .nav-btn {
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 38px; height: 38px; border-radius: 50%;
    /* 中性毛玻璃：浅色页不「一坨黑」，深色页靠亮边+字影仍可辨 */
    background: rgba(96, 96, 104, 0.34);
    border: 1.5px solid rgba(255, 255, 255, 0.55);
    color: #fff;
    font-size: 17px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    opacity: 0.95; transition: opacity 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s;
    backdrop-filter: blur(14px) saturate(1.2);
    -webkit-backdrop-filter: blur(14px) saturate(1.2);
    z-index: 10;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.12) inset,
      0 2px 12px rgba(0, 0, 0, 0.28);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55), 0 0 1px rgba(0, 0, 0, 0.4);
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.22));
  }
  .slide-container:hover .nav-btn { opacity: 1; }
  .nav-btn:hover {
    background: rgba(110, 110, 120, 0.48);
    border-color: rgba(255, 255, 255, 0.78);
    color: #fff;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.18) inset,
      0 3px 14px rgba(0, 0, 0, 0.32);
  }
  @media (hover: none) {
    .nav-btn { opacity: 1; }
  }
  .nav-prev { left: 18px; }
  .nav-next { right: 18px; }

  .bottom-bar {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 48px; background: rgba(0,0,0,0.6);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; z-index: 10;
    opacity: 0.88; transition: opacity 0.25s;
  }
  .slide-container:hover .bottom-bar { opacity: 1; }
  @media (hover: none) {
    .bottom-bar { opacity: 1; }
  }

  .page-info { color: rgba(255,255,255,0.6); font-size: 14px; }
  .slide-title { color: rgba(255,255,255,0.85); font-size: 14px; font-weight: 500; }

  .progress-bar {
    position: absolute; bottom: 48px; left: 0; right: 0; height: 3px;
    background: rgba(255,255,255,0.1); z-index: 10;
  }
  .progress-fill {
    height: 100%; background: rgba(100,160,255,0.7);
    transition: width 0.3s ease;
  }

  /* ── Script drawer (bottom panel, 3 height modes) ──────────────── */
  .script-drawer {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: rgba(12,12,18,0.88);
    backdrop-filter: blur(24px) saturate(1.4); -webkit-backdrop-filter: blur(24px) saturate(1.4);
    border-top: 1px solid rgba(255,255,255,0.08);
    transform: translateY(100%);
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 30; display: flex; flex-direction: column;
  }
  .script-drawer.open { transform: translateY(0); }
  .script-drawer.h-compact { height: 140px; }
  .script-drawer.h-normal  { height: 240px; }
  .script-drawer.h-tall    { height: 380px; }

  .drawer-handle {
    flex-shrink: 0; height: 36px;
    display: flex; align-items: center; justify-content: center; gap: 16px;
    cursor: pointer; user-select: none;
  }
  .drawer-grip {
    width: 40px; height: 4px; border-radius: 2px;
    background: rgba(255,255,255,0.2);
  }
  .drawer-label {
    font-size: 12px; color: rgba(255,255,255,0.4);
    letter-spacing: 0.05em; text-transform: uppercase;
  }
  .drawer-close {
    position: absolute; top: 8px; right: 16px;
    background: none; border: none; color: rgba(255,255,255,0.35);
    font-size: 18px; cursor: pointer; padding: 4px 8px;
  }
  .drawer-close:hover { color: rgba(255,255,255,0.7); }

  .script-body {
    flex: 1; min-height: 0; overflow-y: auto; padding: 0 48px 20px;
    font-size: 18px; line-height: 1.85; color: rgba(255,255,255,0.82);
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
    letter-spacing: 0.02em;
    scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent;
  }
  .script-body.script-sparse {
    display: flex; flex-direction: column; justify-content: center;
    align-items: stretch;
  }
  .script-body.script-sparse .script-page-label { margin-bottom: 12px; }
  .script-body::-webkit-scrollbar { width: 5px; }
  .script-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
  .script-body .script-page-label {
    font-size: 12px; color: rgba(100,160,255,0.7); font-weight: 600;
    letter-spacing: 0.1em; margin-bottom: 8px; text-transform: uppercase;
  }
  .script-body .script-text {
    white-space: pre-wrap; word-break: break-word;
  }

  /* 逐字稿：关闭面板时显示；打开面板后隐藏（用 × / Esc / S 关闭后再出现） */
  .script-toggle {
    position: absolute; bottom: 56px; right: 24px;
    visibility: visible;
    background: rgba(20,20,24,0.55); border: 1px solid rgba(255,255,255,0.2);
    color: rgba(255,255,255,0.88); font-size: 13px; padding: 6px 14px;
    border-radius: 8px; cursor: pointer; z-index: 25;
    opacity: 0.92; transition: opacity 0.25s, visibility 0.2s, background 0.2s;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  }
  .slide-container:hover .script-toggle { opacity: 1; }
  @media (hover: none) {
    .script-toggle { opacity: 1; }
  }
  .script-toggle:hover { background: rgba(255,255,255,0.16); color: #fff; }
  .script-toggle.active {
    background: rgba(100,160,255,0.2); border-color: rgba(100,160,255,0.3); color: rgba(100,160,255,0.9);
  }
  .slide-container:has(.script-drawer.open) .script-toggle {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
  }
</style>
</head>
<body>
<div class="slide-container" id="app">
  <img class="slide-img" id="slideImg" />
  <button class="nav-btn nav-prev" onclick="prev()">&#8249;</button>
  <button class="nav-btn nav-next" onclick="next()">&#8250;</button>
  <div class="progress-bar"><div class="progress-fill" id="progress"></div></div>
  <div class="bottom-bar">
    <span class="page-info" id="pageInfo"></span>
    <span class="slide-title" id="slideTitle"></span>
  </div>
  <button type="button" class="script-toggle" id="scriptBtn" onclick="toggleScript()">逐字稿</button>
  <div class="script-drawer" id="drawer">
    <div class="drawer-handle" onclick="cycleHeight()">
      <span class="drawer-grip"></span>
      <span class="drawer-label" id="drawerLabel">逐字稿</span>
    </div>
    <button class="drawer-close" onclick="closeScript()">&times;</button>
    <div class="script-body" id="scriptBody"></div>
  </div>
</div>
<script>
const images = [
    ${imgSrcList}
  ];
const meta = ${slidesJSON};
let idx = 0;
let drawerOpen = false;
const heights = ['h-compact', 'h-normal', 'h-tall'];
let heightIdx = 1;

const drawer    = document.getElementById('drawer');
const scriptBtn = document.getElementById('scriptBtn');
const scriptBody = document.getElementById('scriptBody');
const drawerLabel = document.getElementById('drawerLabel');

function show(i) {
  idx = Math.max(0, Math.min(images.length - 1, i));
  document.getElementById('slideImg').src = images[idx];
  document.getElementById('pageInfo').textContent = (idx + 1) + ' / ' + images.length;
  document.getElementById('slideTitle').textContent = meta[idx]?.title || '';
  document.getElementById('progress').style.width = ((idx + 1) / images.length * 100) + '%';
  updateScript();
}

function updateScript() {
  const s = meta[idx]?.script || '';
  const label = meta[idx]?.title || ('Slide ' + (idx + 1));
  const charCount = s.length;
  const sparse = charCount < 220;
  scriptBody.classList.toggle('script-sparse', sparse);
  scriptBody.innerHTML = '<div class="script-page-label">' + escH(label) + ' · ' + charCount + ' 字</div>'
    + '<div class="script-text">' + escH(s) + '</div>';
  drawerLabel.textContent = label + ' · 逐字稿';
  scriptBody.scrollTop = 0;
  if (drawerOpen) {
    if (sparse) setHeight(0);
    else if (charCount > 180 && heightIdx === 0) setHeight(1);
  }
}

function escH(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function toggleScript() {
  drawerOpen = !drawerOpen;
  drawer.classList.toggle('open', drawerOpen);
  scriptBtn.classList.toggle('active', drawerOpen);
  if (drawerOpen) {
    const n = (meta[idx]?.script || '').length;
    if (n < 220) setHeight(0);
    else setHeight(heightIdx);
  }
}
function closeScript() {
  drawerOpen = false;
  drawer.classList.remove('open');
  scriptBtn.classList.remove('active');
}
function cycleHeight() {
  heightIdx = (heightIdx + 1) % heights.length;
  setHeight(heightIdx);
}
function setHeight(i) {
  heightIdx = i;
  heights.forEach(h => drawer.classList.remove(h));
  drawer.classList.add(heights[heightIdx]);
}

function prev() { show(idx - 1); }
function next() { show(idx + 1); }

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  else if (e.key === 'ArrowUp' && drawerOpen) { e.preventDefault(); cycleHeight(); }
  else if (e.key === 'ArrowDown' && drawerOpen) { e.preventDefault(); heightIdx = (heightIdx - 1 + heights.length) % heights.length; setHeight(heightIdx); }
  else if (e.key === 'Escape') { closeScript(); }
  else if (e.key === 's' || e.key === 'S') { toggleScript(); }
});

let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; });
document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) { dx > 0 ? prev() : next(); }
});

setHeight(1);
show(0);
</script>
</body>
</html>`;

  fs.writeFileSync(outPath, html, 'utf8');
}

const SLIDE_W = 1920;
const SLIDE_H = 1080;

/**
 * 轮播各页原始 page_XXX.html（iframe）。翻页会重新加载页面，CSS 入场动画会再播一遍。
 * 主交付 `presentation.html`；纯截图轮播见 `presentation_static.html`。需与 page_*.html 同目录。
 */
function generateHTMLPresentationLive(htmlDir, scenes, outPath) {
  if (!fs.existsSync(htmlDir)) {
    console.error(`   ⚠️  presentation (iframe): 目录不存在 ${htmlDir}`);
    return false;
  }
  const files = fs.readdirSync(htmlDir)
    .filter(f => /^page_\d{3}\.html$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (files.length === 0) {
    console.error('   ⚠️  presentation (iframe): 未找到 page_*.html');
    return false;
  }

  const pages = files.map(f => './' + f.replace(/\\/g, '/'));
  const metaArr = files.map((_, i) => {
    const scene = scenes[i] || {};
    return { title: scene.title || `Slide ${i + 1}`, script: scene.script || '' };
  });
  const coverTitle = scenes.find(s => s.type === 'cover')?.title || 'Presentation';
  const pagesJSON = JSON.stringify(pages);
  const metaJSON = JSON.stringify(metaArr);

  const html = `<!DOCTYPE html>
<!-- SlideForge: 本文件为 iframe 轮播壳，必须与同目录 page_001.html、page_002.html… 一并分发，单独拷贝无效。单文件内嵌截图轮播请用 presentation_static.html。 -->
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(coverTitle)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

  .slide-container {
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    position: relative;
  }
  .slide-stage {
    flex: 1;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    min-height: 0;
  }
  .scale-root {
    width: ${SLIDE_W}px; height: ${SLIDE_H}px;
    transform-origin: center center;
    flex-shrink: 0;
  }
  .scale-root iframe {
    width: ${SLIDE_W}px; height: ${SLIDE_H}px;
    border: 0;
    display: block;
    background: #0a0a0a;
  }

  .nav-btn {
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 38px; height: 38px; border-radius: 50%;
    background: rgba(96, 96, 104, 0.34);
    border: 1.5px solid rgba(255, 255, 255, 0.55);
    color: #fff;
    font-size: 17px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    opacity: 0.95; transition: opacity 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s;
    backdrop-filter: blur(14px) saturate(1.2);
    -webkit-backdrop-filter: blur(14px) saturate(1.2);
    z-index: 10;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.12) inset,
      0 2px 12px rgba(0, 0, 0, 0.28);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55), 0 0 1px rgba(0, 0, 0, 0.4);
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.22));
  }
  .slide-container:hover .nav-btn { opacity: 1; }
  .nav-btn:hover {
    background: rgba(110, 110, 120, 0.48);
    border-color: rgba(255, 255, 255, 0.78);
    color: #fff;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.18) inset,
      0 3px 14px rgba(0, 0, 0, 0.32);
  }
  @media (hover: none) {
    .nav-btn { opacity: 1; }
  }
  .nav-prev { left: 18px; }
  .nav-next { right: 18px; }

  .bottom-bar {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 48px; background: rgba(0,0,0,0.6);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; z-index: 10;
    opacity: 0.88; transition: opacity 0.25s;
  }
  .slide-container:hover .bottom-bar { opacity: 1; }
  @media (hover: none) {
    .bottom-bar { opacity: 1; }
  }

  .page-info { color: rgba(255,255,255,0.6); font-size: 14px; }
  .slide-title { color: rgba(255,255,255,0.85); font-size: 14px; font-weight: 500; }

  .progress-bar {
    position: absolute; bottom: 48px; left: 0; right: 0; height: 3px;
    background: rgba(255,255,255,0.1); z-index: 10;
  }
  .progress-fill {
    height: 100%; background: rgba(100,160,255,0.7);
    transition: width 0.3s ease;
  }

  .live-hint {
    position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
    z-index: 12;
    font-size: 12px; color: rgba(255,255,255,0.55);
    background: rgba(0,0,0,0.45); padding: 4px 12px; border-radius: 6px;
    pointer-events: none;
  }

  .script-drawer {
    position: absolute; left: 0; right: 0; bottom: 0;
    background: rgba(12,12,18,0.88);
    backdrop-filter: blur(24px) saturate(1.4); -webkit-backdrop-filter: blur(24px) saturate(1.4);
    border-top: 1px solid rgba(255,255,255,0.08);
    transform: translateY(100%);
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 30;
    display: flex; flex-direction: column;
  }
  .script-drawer.open { transform: translateY(0); }
  .script-drawer.h-compact { height: 140px; }
  .script-drawer.h-normal  { height: 240px; }
  .script-drawer.h-tall    { height: 380px; }
  .drawer-handle {
    flex-shrink: 0; height: 36px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .drawer-grip { width: 36px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); }
  .drawer-label { margin-left: 10px; font-size: 12px; color: rgba(255,255,255,0.5); }
  .drawer-close {
    position: absolute; top: 6px; right: 12px;
    background: transparent; border: none; color: rgba(255,255,255,0.6);
    font-size: 22px; cursor: pointer; line-height: 1; padding: 4px 8px;
  }
  .script-body {
    flex: 1; overflow-y: auto; padding: 12px 20px 20px;
    color: rgba(255,255,255,0.88); font-size: 14px; line-height: 1.55;
  }
  .script-body.script-sparse {
    display: flex; flex-direction: column; justify-content: center;
    align-items: stretch;
  }
  .script-body::-webkit-scrollbar { width: 5px; }
  .script-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
  .script-body .script-page-label {
    font-size: 12px; color: rgba(100,160,255,0.7); font-weight: 600;
    letter-spacing: 0.1em; margin-bottom: 8px; text-transform: uppercase;
  }
  .script-body .script-text {
    white-space: pre-wrap; word-break: break-word;
  }

  .script-toggle {
    position: absolute; bottom: 56px; right: 24px;
    visibility: visible;
    background: rgba(20,20,24,0.55); border: 1px solid rgba(255,255,255,0.2);
    color: rgba(255,255,255,0.88); font-size: 13px; padding: 6px 14px;
    border-radius: 8px; cursor: pointer; z-index: 25;
    opacity: 0.92; transition: opacity 0.25s, visibility 0.2s, background 0.2s;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  }
  .slide-container:hover .script-toggle { opacity: 1; }
  @media (hover: none) {
    .script-toggle { opacity: 1; }
  }
  .script-toggle:hover { background: rgba(255,255,255,0.16); color: #fff; }
  .script-toggle.active {
    background: rgba(100,160,255,0.2); border-color: rgba(100,160,255,0.3); color: rgba(100,160,255,0.9);
  }
  .slide-container:has(.script-drawer.open) .script-toggle {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
  }
</style>
</head>
<body>
<div class="slide-container" id="app">
  <div class="live-hint">可交互单页（hover / 入场动画）。若 iframe 空白：请用本地 HTTP 打开本目录（见终端 npm run preview:html）。静态轮播打开 presentation_static.html</div>
  <div class="slide-stage">
    <div class="scale-root" id="scaleRoot">
      <iframe id="slideFrame" title="slide"></iframe>
    </div>
  </div>
  <button class="nav-btn nav-prev" onclick="prev()">&#8249;</button>
  <button class="nav-btn nav-next" onclick="next()">&#8250;</button>
  <div class="progress-bar"><div class="progress-fill" id="progress"></div></div>
  <div class="bottom-bar">
    <span class="page-info" id="pageInfo"></span>
    <span class="slide-title" id="slideTitle"></span>
  </div>
  <button type="button" class="script-toggle" id="scriptBtn" onclick="toggleScript()">逐字稿</button>
  <div class="script-drawer" id="drawer">
    <div class="drawer-handle" onclick="cycleHeight()">
      <span class="drawer-grip"></span>
      <span class="drawer-label" id="drawerLabel">逐字稿</span>
    </div>
    <button class="drawer-close" onclick="closeScript()">&times;</button>
    <div class="script-body" id="scriptBody"></div>
  </div>
</div>
<script>
const pages = ${pagesJSON};
const meta = ${metaJSON};
let idx = 0;
let drawerOpen = false;
const heights = ['h-compact', 'h-normal', 'h-tall'];
let heightIdx = 1;

const drawer = document.getElementById('drawer');
const scriptBtn = document.getElementById('scriptBtn');
const scriptBody = document.getElementById('scriptBody');
const drawerLabel = document.getElementById('drawerLabel');
const slideFrame = document.getElementById('slideFrame');
const scaleRoot = document.getElementById('scaleRoot');
const appEl = document.getElementById('app');

function fitScale() {
  const w = appEl.clientWidth;
  const h = appEl.clientHeight;
  const s = Math.min(w / ${SLIDE_W}, h / ${SLIDE_H}) * 0.98;
  scaleRoot.style.transform = 'scale(' + s + ')';
}

function show(i) {
  idx = Math.max(0, Math.min(pages.length - 1, i));
  slideFrame.src = pages[idx];
  document.getElementById('pageInfo').textContent = (idx + 1) + ' / ' + pages.length;
  document.getElementById('slideTitle').textContent = meta[idx]?.title || '';
  document.getElementById('progress').style.width = ((idx + 1) / pages.length * 100) + '%';
  updateScript();
  requestAnimationFrame(fitScale);
}

function updateScript() {
  const s = meta[idx]?.script || '';
  const label = meta[idx]?.title || ('Slide ' + (idx + 1));
  const charCount = s.length;
  const sparse = charCount < 220;
  scriptBody.classList.toggle('script-sparse', sparse);
  scriptBody.innerHTML = '<div class="script-page-label">' + escH(label) + ' · ' + charCount + ' 字</div>'
    + '<div class="script-text">' + escH(s) + '</div>';
  drawerLabel.textContent = label + ' · 逐字稿';
  scriptBody.scrollTop = 0;
  if (drawerOpen) {
    if (sparse) setHeight(0);
    else if (charCount > 180 && heightIdx === 0) setHeight(1);
  }
}

function escH(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function toggleScript() {
  drawerOpen = !drawerOpen;
  drawer.classList.toggle('open', drawerOpen);
  scriptBtn.classList.toggle('active', drawerOpen);
  if (drawerOpen) {
    const n = (meta[idx]?.script || '').length;
    if (n < 220) setHeight(0);
    else setHeight(heightIdx);
  }
}
function closeScript() {
  drawerOpen = false;
  drawer.classList.remove('open');
  scriptBtn.classList.remove('active');
}
function cycleHeight() {
  heightIdx = (heightIdx + 1) % heights.length;
  setHeight(heightIdx);
}
function setHeight(i) {
  heightIdx = i;
  heights.forEach(h => drawer.classList.remove(h));
  drawer.classList.add(heights[heightIdx]);
}

function prev() { show(idx - 1); }
function next() { show(idx + 1); }

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  else if (e.key === 'ArrowUp' && drawerOpen) { e.preventDefault(); cycleHeight(); }
  else if (e.key === 'ArrowDown' && drawerOpen) {
    e.preventDefault();
    heightIdx = (heightIdx - 1 + heights.length) % heights.length;
    setHeight(heightIdx);
  }
  else if (e.key === 'Escape') { closeScript(); }
  else if (e.key === 's' || e.key === 'S') { toggleScript(); }
});

slideFrame.addEventListener('load', fitScale);
window.addEventListener('resize', fitScale);

setHeight(1);
show(0);
</script>
</body>
</html>`;

  fs.writeFileSync(outPath, html, 'utf8');
  return true;
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
