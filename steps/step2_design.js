#!/usr/bin/env node
// Step 2: 设计参数生成
// 仅使用本地 frontend-presets（OpenClaw graphic-design skill 已移除；若再接外部 agent 建议用显式环境变量开关）

const fs = require('fs');
const path = require('path');
const { ensureDir, writeResult } = require('./utils/step-utils');

const STYLE_PRESETS = require('./presets/frontend-presets.json');
const { normalizePreset } = require('../utils/page_animations');
const DEFAULT_PRESET = 'electric-studio';
const PROFESSIONAL_MODE = 'deep-tech-keynote';
const VALID_DESIGN_MODES = new Set(Object.keys(STYLE_PRESETS.presets || {}));

// ─── Content type → design_mode auto-selection ───────────────────────────────

const CONTENT_TYPE_MAP = {
  // ── 官方主题 ────────────────────────────────────────────────────────────
  '技术文档':  'terminal-green',   // code-heavy, engineering docs
  'technical': 'terminal-green',
  '商业报告':  'bold-signal',       // business reports, strategy decks
  'business':  'bold-signal',
  '教学材料':  'creative-voltage',  // tutorials, courses, how-to guides
  'educational':'creative-voltage',
  '产品介绍':  'neon-cyber',        // product launches, demos
  'product':   'neon-cyber',
  '演讲稿':    'deep-tech-keynote', // keynotes, conference talks
  'keynote':   'deep-tech-keynote',
  '通用演示':  'electric-studio',   // default / general purpose
  'general':   'electric-studio',
  // ── 实验主题（已升级，参与自动选择）──────────────────────────────────────
  '学习笔记':  'notebook-tabs',    // 读书笔记、学习总结、知识整理
  'notes':     'notebook-tabs',
  '深度内容':  'paper-ink',        // 长文章、深度报道、书评、杂志风
  'editorial': 'paper-ink',
  '创意设计':  'pastel-geometry',  // 设计提案、创意项目、活泼展示
  'creative':  'pastel-geometry',
  '生活方式':  'split-pastel',     // 时尚、美妆、生活方式、种草内容
  'lifestyle': 'split-pastel',
  '品牌展示':  'swiss-modern',     // 企业VI、品牌手册、简洁商业展示
  'brand':     'swiss-modern',
  '文化艺术':  'vintage-editorial',// 历史、文化、艺术、传统、书评
  'culture':   'vintage-editorial',
  '人文社科':  'dark-botanical',   // 人文、社科、策展、学术气质（深色暖调）
  'humanities':'dark-botanical',
};

function autoSelectDesignMode(scenes) {
  const bodyText = scenes.flatMap(s => {
    if (Array.isArray(s.body)) return s.body;
    if (typeof s.body === 'string') return [s.body];
    return [];
  }).join(' ');
  const contentType = inferContentType(bodyText, scenes);
  const selected = CONTENT_TYPE_MAP[contentType] || DEFAULT_PRESET;
  console.error(`   🎨 内容类型: ${contentType} → 自动选择主题: ${selected}`);
  return selected;
}

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  try {
    const params = JSON.parse(input);
    // design_mode: undefined/null = auto-select; explicit string = user override
    const { scenes, output_dir = './project' } = params;
    const userDesignMode = params.design_mode || null;

    // Resolve scenes: 优先参数传入 > 从 output_dir/project.json 读取
    let scenesData = scenes;
    if (!scenesData && output_dir) {
      const projectFile = path.join(path.resolve(output_dir), 'project.json');
      if (fs.existsSync(projectFile)) {
        const projectData = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
        scenesData = projectData.scenes || [];
        console.error(`   📄 从 project.json 加载 ${scenesData.length} 个分镜`);
      }
    }
    if (typeof scenesData === 'string') {
      scenesData = JSON.parse(fs.readFileSync(scenesData, 'utf8'));
    }
    scenesData = scenesData || [];

    // Determine final design_mode: user override > project.json saved value > auto-select
    let design_mode = userDesignMode;
    let modeSource = 'user';

    if (!design_mode) {
      const projectFile = path.join(path.resolve(output_dir), 'project.json');
      if (fs.existsSync(projectFile)) {
        const proj = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
        const rec = proj.recommended_design_mode;
        if (rec && VALID_DESIGN_MODES.has(String(rec).trim())) {
          design_mode = String(rec).trim();
          modeSource = 'step0-llm';
        } else if (proj.design_mode && proj.design_mode !== DEFAULT_PRESET) {
          design_mode = proj.design_mode;
          modeSource = 'project.json';
        }
      }
    }

    if (!design_mode) {
      design_mode = autoSelectDesignMode(scenesData);
      modeSource = 'auto';
    }

    console.error(`🎨 生成设计参数（主题: ${design_mode}，来源: ${modeSource}）`);

    let designParams;
    let presetSource = 'frontend-presets';
    let fallbackReason = null;

    try {
      if (design_mode === PROFESSIONAL_MODE) {
        designParams = getDeepTechKeynotePreset();
        presetSource = 'deep-tech-keynote';
        console.error(`   ✅ 使用专业演讲稿模式: ${PROFESSIONAL_MODE}`);
      } else {
        designParams = getFallbackPreset(design_mode);
      }
    } catch (err) {
      fallbackReason = err.message;
      presetSource = 'emergency-fallback';
      console.error(`   ❌ 所有方式均失败，最终 emergency fallback: ${fallbackReason}`);
      designParams = getFallbackPreset(DEFAULT_PRESET);
    }

    // 页面导演参数：不是样式 token，而是每页的视觉导演决策
    designParams.page_directions = buildPageDirections(scenesData, designParams, design_mode);
    designParams.strategy_version = 'director-v1';
    designParams.page_animations = params.page_animations !== false;
    designParams.page_animation_preset = normalizePreset(
      params.page_animation_preset ?? designParams.page_animation_preset
    );

    const outputPath = path.resolve(output_dir);
    ensureDir(outputPath);
    const designFile = path.join(outputPath, 'design_params.json');
    fs.writeFileSync(designFile, JSON.stringify(designParams, null, 2));

    writeResult({
      success: true,
      step: 'step2',
      outputs: [designFile],
      message: `生成设计参数（${design_mode}）`,
      metadata: {
        design_mode,
        mode_source: modeSource,
        preset_source: presetSource,
        fallback_reason: fallbackReason
      }
    });
  } catch (err) {
    console.error('❌ Step 2 失败:', err.message);
    process.exit(1);
  }
});

function inferContentType(bodyText, scenes) {
  const text = `${bodyText} ${scenes.map(s => `${s.title || ''} ${s.eyebrow || ''}`).join(' ')}`;

  // 官方主题内容类型（高优先级）
  if (/代码|API|工程|开发|模型|agent|prompt|部署|架构|函数|算法|数据库|CI\/CD/i.test(text)) return '技术文档';
  if (/报告|战略|经营|增长|汇报|指标|财报|OKR|KPI|季度|年度|市场份额/i.test(text)) return '商业报告';
  if (/演讲|主题演讲|Keynote|大会|峰会|发布会|年会|TED/i.test(text)) return '演讲稿';
  if (/产品|功能|上线|发布|Demo|APP|用户体验|交互|界面|版本/i.test(text)) return '产品介绍';
  if (/课程|教学|培训|方法论|步骤|教程|学习路径|知识点/i.test(text)) return '教学材料';

  // 实验主题内容类型
  if (/读书|笔记|摘录|书评|阅读|总结|复盘|手账|随笔|心得|收获/i.test(text)) return '学习笔记';
  if (/深度|报道|访谈|专题|评论|文章|杂志|观点|分析|解读|长文/i.test(text)) return '深度内容';
  if (/人文|社科|人类学|社会学|心理学|策展|民族志|博物馆学|田野调查|学术期刊|思辨|伦理/i.test(text)) return '人文社科';
  if (/历史|文化|艺术|传统|古典|非遗|博物|文学|诗|经典/i.test(text)) return '文化艺术';
  if (/时尚|美妆|穿搭|生活方式|种草|探店|好物|分享|日常|打卡/i.test(text)) return '生活方式';
  if (/品牌|VI|视觉|logo|设计规范|色彩|字体|企业形象|手册/i.test(text)) return '品牌展示';
  if (/创意|设计|插画|视觉|提案|灵感|风格|美学|配色|排版/i.test(text)) return '创意设计';

  return '通用演示';
}

function buildPageDirections(scenes, designParams, design_mode) {
  // ── Pass 1: per-page content analysis ──────────────────────────────────────
  const directions = scenes.map((scene, idx) => {
    const bodyText = Array.isArray(scene.body) ? scene.body.join(' ') : (scene.body || '');
    const text = `${scene.title || ''} ${bodyText}`;
    const hasCode  = scene.code_snippet != null || /`|代码|API|query\.ts|buildTool|python|bash/i.test(text);
    const hasQuote = scene.quote_body != null || /“|”|‘|指出|认为|原话/.test(text);
    const hasNumbers = scene.big_number != null || /\d+(?:\.\d+)?(?:%|倍|亿|万|x\b)/.test(text);
    const hasKeyPoints = Array.isArray(scene.key_points) && scene.key_points.length > 0;
    const hasStats     = Array.isArray(scene.stats)      && scene.stats.length > 0;
    const hasSteps     = Array.isArray(scene.steps)      && scene.steps.length > 0;
    const hasTwoCol    = scene.left_body != null;
    const hasTable     = Array.isArray(scene.table_headers) && scene.table_headers.length > 0;
    const hasIcons     = Array.isArray(scene.icons)         && scene.icons.length > 0;
    const hasChart     = Array.isArray(scene.chart_data)    && scene.chart_data.length > 0;
    const hasNavBar    = Array.isArray(scene.nav_items)     && scene.nav_items.length > 0;
    const hasCompare =
      Array.isArray(scene.compare_left_points) && scene.compare_left_points.length > 0 &&
      Array.isArray(scene.compare_right_points) && scene.compare_right_points.length > 0;
    const hasProcessFlow =
      scene.content_variant === 'process_flow' ||
      (Array.isArray(scene.process_stages) && scene.process_stages.length >= 2) ||
      (Array.isArray(scene.flow_lanes) && scene.flow_lanes.length >= 1);
    const hasArchLayers =
      scene.content_variant === 'architecture_stack' ||
      (Array.isArray(scene.layers) && scene.layers.length >= 2);
    const hasFunnelStages =
      scene.content_variant === 'funnel' ||
      (Array.isArray(scene.funnel_stages) && scene.funnel_stages.length >= 2);
    // hybrid variant detection
    const hasStat     = scene.stat_value != null;
    const hasContext  = scene.context_body != null;
    const hasFewIcons = hasIcons && scene.icons.length <= 4;

    let page_intent = 'concept';
    let hero_element = 'none';
    let content_variant = scene.content_variant || 'text';
    let alignment = ['cover', 'summary', 'end'].includes(scene.type) ? 'center' : 'left';
    let density = 'low';
    let decoration_policy = idx === 0 ? 'subtle_glow' : 'none';
    let negative_space = ['cover', 'summary', 'end'].includes(scene.type) ? 'large' : 'medium';
    let visual_priority = ['title', 'keywords'];
    let avoid_elements = ['icons', 'mixed-focus', 'multi-box'];

    if (scene.type === 'cover') {
      page_intent = 'hero';
      visual_priority = ['title', 'subtitle'];
      density = 'low';
      decoration_policy = design_mode === 'apple' ? 'none' : 'subtle_glow';
      negative_space = 'large';
    } else if (scene.type === 'summary' || scene.type === 'end') {
      page_intent = 'summary';
      // Use panel when key_points exist, otherwise text
      if (hasKeyPoints) {
        hero_element = 'key_points';
        content_variant = 'panel';
        density = 'medium';
      } else {
        hero_element = hasNumbers ? 'big_number' : 'none';
        content_variant = 'text';
        density = 'low';
      }
      visual_priority = ['title', 'takeaway'];
      negative_space = 'medium';
    // ── hybrid variants: checked before singles to avoid misclassification ──
    } else if (hasStat && hasKeyPoints && !hasFewIcons) {
      page_intent = 'hybrid_stat';
      hero_element = 'stat_with_points';
      content_variant = 'panel_stat';
      visual_priority = ['title', 'stat', 'key_points'];
      density = 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'code-block');
    } else if (hasStat && hasKeyPoints && !hasNumbers) {
      page_intent = 'hybrid_stat';
      hero_element = 'number_explanation';
      content_variant = 'number_bullets';
      visual_priority = ['stat', 'key_points'];
      density = 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'code-block');
    } else if (hasQuote && hasContext) {
      page_intent = 'quote_with_context';
      hero_element = 'quote_context';
      content_variant = 'quote_context';
      visual_priority = ['quote', 'context'];
      density = 'low';
      decoration_policy = 'none';
      negative_space = 'medium';
      avoid_elements.push('code-block', 'big-number', 'key-points');
    } else if (hasFewIcons && (scene.body || scene.subtitle)) {
      page_intent = 'concept_icons';
      hero_element = 'text_with_icons';
      content_variant = 'text_icons';
      visual_priority = ['title', 'body', 'icons'];
      density = 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'code-block');
    } else if (hasCompare) {
      page_intent = 'comparison';
      hero_element = 'compare';
      content_variant = 'compare';
      visual_priority = ['title', 'left_column', 'right_column'];
      density = 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'code-block', 'timeline');
    } else if (hasProcessFlow) {
      page_intent = 'process';
      hero_element = 'process_flow';
      content_variant = 'process_flow';
      visual_priority = ['title', 'sequence'];
      density = 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'big-number');
    } else if (hasArchLayers) {
      page_intent = 'structure';
      hero_element = 'architecture_stack';
      content_variant = 'architecture_stack';
      visual_priority = ['title', 'layers'];
      density = scene.layers && scene.layers.length >= 5 ? 'rich' : 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'code-block');
    } else if (hasFunnelStages) {
      page_intent = 'metric';
      hero_element = 'funnel';
      content_variant = 'funnel';
      visual_priority = ['title', 'funnel'];
      density = scene.funnel_stages && scene.funnel_stages.length >= 5 ? 'rich' : 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'code-block');
    // ── standard single variants ─────────────────────────────────────────
    } else if (hasChart) {
      page_intent = 'metric';
      hero_element = 'chart';
      content_variant = 'chart';
      visual_priority = ['title', 'chart'];
      density = 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'code-block', 'key-points');
    } else if (hasNavBar) {
      page_intent = 'structure';
      hero_element = 'nav_bar';
      content_variant = 'nav_bar';
      visual_priority = ['title', 'navigation'];
      density = 'low';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'code-block');
    } else if (hasStats) {
      page_intent = 'metric';
      hero_element = 'stats';
      content_variant = 'stats_grid';
      visual_priority = ['numbers', 'labels'];
      density = 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'code-block');
    } else if (hasSteps) {
      page_intent = 'process';
      hero_element = 'steps';
      content_variant = 'timeline';
      visual_priority = ['title', 'sequence'];
      density = 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'big-number');
    } else if (hasTwoCol) {
      page_intent = 'structure';
      hero_element = 'two_col';
      content_variant = 'two_col';
      visual_priority = ['title', 'left_body', 'right_points'];
      density = 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'big-number', 'code-block');
    } else if (hasKeyPoints) {
      page_intent = 'structure';
      hero_element = 'key_points';
      content_variant = 'panel';
      visual_priority = ['title', 'structure'];
      density = 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'big-number', 'code-block');
    } else if (hasCode) {
      page_intent = 'deep-tech';
      hero_element = 'code';
      content_variant = 'code';
      visual_priority = ['title', 'code'];
      density = 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'big-number', 'key-points');
    } else if (hasQuote) {
      page_intent = 'quote';
      hero_element = 'quote';
      content_variant = 'quote';
      visual_priority = ['title', 'quote'];
      density = 'low';
      decoration_policy = 'none';
      negative_space = 'large';
      avoid_elements.push('code-block', 'big-number', 'key-points');
    } else if (hasTable) {
      page_intent = 'comparison';
      hero_element = 'table';
      content_variant = 'table';
      visual_priority = ['title', 'table'];
      density = 'high';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'big-number');
    } else if (hasIcons) {
      page_intent = 'overview';
      hero_element = 'icons';
      content_variant = 'icon_grid';
      visual_priority = ['title', 'icons'];
      density = 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'code-block');
    } else if (hasNumbers) {
      page_intent = 'metric';
      hero_element = 'inline_number';
      content_variant = 'number';
      visual_priority = ['title', 'metric'];
      density = 'medium';
      decoration_policy = 'none';
      avoid_elements.push('quote', 'code-block', 'key-points');
    }

    // ── layout_hint: 内容属性驱动，scene 已有值则直接采用 ─────────────────
    const layout_hint = scene.layout_hint || computeLayoutHint(scene, content_variant);

    return {
      id: scene.id,
      page_intent,
      alignment,
      density,
      hero_element,
      content_variant,
      layout_hint,
      decoration_policy,
      negative_space,
      visual_priority,
      avoid_elements,
      max_body_lines: page_intent === 'structure' ? 1 : (density === 'low' ? 2 : 3),
      max_key_points: 3
    };
  });

  // ── Pass 2: presentation rhythm & flow ─────────────────────────────────────
  // layout_hint 节奏修正：连续3页同 hint 时循环切换，避免单调
  // Goal: avoid visual monotony by detecting runs of identical variants and
  // applying layout hints that differentiate pages even within the same variant.
  const contentPages = directions.filter(d => !['hero', 'summary'].includes(d.page_intent));
  const total = contentPages.length;

  // Track consecutive same-variant run length
  let runLen = 0;
  let lastVariant = null;
  contentPages.forEach((dir, i) => {
    if (dir.content_variant === lastVariant) {
      runLen++;
    } else {
      runLen = 0;
      lastVariant = dir.content_variant;
    }

    // After 2+ consecutive 'text' pages, promote the next one to 'hairline'
    // (a visually distinct layout) if no stronger signal exists
    if (runLen >= 2 && dir.content_variant === 'text') {
      dir.layout_variation = 'accent';       // signal to use accent color emphasis
      dir.decoration_policy = 'hairline';    // add hairline separator
    }

    // First content page after cover: give it extra visual weight
    if (i === 0) {
      dir.visual_weight = 'high';
      dir.decoration_policy = dir.decoration_policy === 'none' ? 'subtle_glow' : dir.decoration_policy;
    }

    // Last content page before summary: tighten it up (signal resolution)
    if (i === total - 1) {
      dir.layout_variation = 'closing';
      dir.negative_space = 'large';
    }
  });

  // If total content pages > 5, ensure at least one visual break every 3 pages
  if (total > 5) {
    for (let i = 2; i < total; i += 3) {
      const dir = contentPages[i];
      if (dir.content_variant === 'text' && !dir.layout_variation) {
        dir.layout_variation = 'visual_break';
        dir.decoration_policy = 'hairline';
      }
    }
  }

  // layout_hint 节奏修正：连续 3+ 页同 variant 且同 hint，打破单调
  const HINT_CYCLES = {
    panel:      ['stack', 'grid-3', 'cards', 'sidebar-left'],
    stats_grid: ['row', 'hero-1', '2x2'],
    timeline:   ['vertical', 'horizontal'],
  };
  let hintRun = 0, lastHint = null, lastVariant2 = null;
  contentPages.forEach(dir => {
    const cycle = HINT_CYCLES[dir.content_variant];
    if (!cycle) { hintRun = 0; lastHint = null; lastVariant2 = null; return; }
    if (dir.content_variant === lastVariant2 && dir.layout_hint === lastHint) {
      hintRun++;
      if (hintRun >= 2) {
        const idx = cycle.indexOf(dir.layout_hint);
        dir.layout_hint = cycle[(idx + 1) % cycle.length];
        hintRun = 0;
      }
    } else {
      hintRun = 0;
    }
    lastHint = dir.layout_hint;
    lastVariant2 = dir.content_variant;
  });

  return directions;
}

// ── layout_hint 内容属性驱动计算 ───────────────────────────────────────────────
function computeLayoutHint(scene, variant) {
  switch (variant) {
    case 'panel': {
      const kpCount = Array.isArray(scene.key_points) ? scene.key_points.length : 0;
      if (kpCount <= 3 && (scene.key_points || []).every(p => p.length <= 20)) return 'grid-3';
      if (kpCount >= 5) return 'stack';
      if (scene.panel_title || scene.panel_eyebrow) return 'sidebar-left';
      return 'stack';
    }
    case 'stats_grid': {
      const count = Array.isArray(scene.stats) ? scene.stats.length : 0;
      if (count === 1) return 'hero-1';
      if (count === 4) return '2x2';
      return 'row';
    }
    case 'timeline': {
      const count = Array.isArray(scene.steps) ? scene.steps.length : 0;
      if (count <= 4) return 'horizontal';
      return 'vertical';
    }
    case 'two_col': {
      const leftLen = String(scene.left_body || '').length;
      const kpCount = Array.isArray(scene.key_points) ? scene.key_points.length : 0;
      if (leftLen > 200) return 'wide-left';
      if (kpCount >= 4) return 'wide-right';
      return 'equal';
    }
    case 'quote': {
      const qLen = String(scene.quote_body || '').length;
      if (scene.quote_source) return 'left-bar';
      if (qLen < 40) return 'full';
      return 'center';
    }
    case 'number': {
      const hasBody = Array.isArray(scene.body) ? scene.body.length > 0 : Boolean(scene.body);
      return hasBody ? 'split' : 'center';
    }
    case 'card_grid': {
      const count = Array.isArray(scene.cards) ? scene.cards.length : 0;
      if (count === 4) return '2x2';
      return null;
    }
    case 'compare': {
      const lc = (scene.compare_left_points || []).join('').length;
      const rc = (scene.compare_right_points || []).join('').length;
      if (lc > rc * 1.35) return 'wide-left';
      if (rc > lc * 1.35) return 'wide-right';
      return 'equal';
    }
    case 'process_flow': {
      if (Array.isArray(scene.flow_lanes) && scene.flow_lanes.length >= 1) return 'swimlane';
      return 'horizontal';
    }
    case 'architecture_stack': {
      const n = Array.isArray(scene.layers) ? scene.layers.length : 0;
      return n >= 5 ? 'compact' : null;
    }
    case 'funnel': {
      const n = Array.isArray(scene.funnel_stages) ? scene.funnel_stages.length : 0;
      return n >= 5 ? 'compact' : null;
    }
    default:
      return null;
  }
}

function getFallbackPreset(design_mode) {
  const preset = STYLE_PRESETS.presets?.[design_mode] || STYLE_PRESETS.presets?.[DEFAULT_PRESET];
  const resolvedMode = STYLE_PRESETS.presets?.[design_mode] ? design_mode : DEFAULT_PRESET;
  const css = preset.cssVars || {};

  // Extract accent color from card-bg or bg-primary
  const accentRaw = css['--card-bg'] || css['--accent-blue'] || css['--accent-neon'] || '#6366f1';
  // Normalize hex to 6-char for manipulation
  const accentHex = accentRaw.startsWith('#') ? accentRaw.slice(1) : '6366f1';
  const accentLight = '#' + accentHex.slice(0, 2) + accentHex.slice(2, 4) + 'ff'; // lighten

  return {
    colorScheme: {
      background: css['--bg-primary'] || css['--bg-gradient'] || '#0a0a0a',
      backgroundGradient: css['--bg-gradient'] || null,
      textPrimary: css['--text-primary'] || '#ffffff',
      textSecondary: css['--text-secondary'] || '#aaaaaa',
      primary: accentRaw,
      accent: css['--accent-neon'] || css['--accent-warm'] || accentRaw,
      accentLight: accentLight,
      accentDark: css['--accent-dark'] || '#000000',
    },
    typography: {
      title: {
        font: preset.displayFont || 'Space Grotesk',
        coverSize: 78,
        sectionSize: 58,
        weight: 700,
        letterSpacing: '-0.03em',
        lineHeight: 1.08
      },
      body: {
        font: preset.bodyFont || 'PingFang SC',
        size: 22,
        lineHeight: 1.55,
        weight: 400
      },
      code: {
        font: 'JetBrains Mono',
        size: 18,
        background: `rgba(${parseInt(accentHex.slice(0,2),16)},${parseInt(accentHex.slice(2,4),16)},${parseInt(accentHex.slice(4,6),16)},0.10)`,
        border: `1px solid rgba(${parseInt(accentHex.slice(0,2),16)},${parseInt(accentHex.slice(2,4),16)},${parseInt(accentHex.slice(4,6),16)},0.22)`,
        borderRadius: '10px'
      }
    },
    decoration: {
      glow: {
        count: 1,
        color: accentRaw,
        size: '600px',
        blur: 150,
        opacity: 0.15,
        position: { top: '-160px', right: '-120px' }
      },
      shapes: preset.signatureElements || [],
      panel: preset.panel ? {
        enabled: true,
        background: preset.panel.background || 'rgba(0,0,0,0.6)',
        border: preset.panel.border || `1px solid ${accentRaw}40`,
        borderTop: preset.panel.borderTop || `1px solid ${accentRaw}20`,
        borderBottom: preset.panel.borderBottom || '1px solid rgba(0,0,0,0.3)',
        shadow: preset.panel.shadow || `0 20px 60px rgba(0,0,0,0.4), 0 4px 12px ${accentRaw}20`,
        innerGlow: preset.panel.innerGlow || `inset 0 1px 0 ${accentRaw}20`,
        radius: preset.panel.radius || '16px',
        blur: preset.panel.blur || '8px'
      } : { enabled: false },
      hairline: preset.panel ? {
        enabled: true,
        color: `rgba(${parseInt(accentHex.slice(0,2),16)},${parseInt(accentHex.slice(2,4),16)},${parseInt(accentHex.slice(4,6),16)},0.35)`
      } : { enabled: false },
      accentBar: preset.signatureElements?.includes('accent-bar') ? {
        enabled: true,
        width: '6px',
        color: accentRaw
      } : { enabled: false }
    },
    specialElements: {
      numbers: {
        size: '56-72px',
        color: accentLight,
        weight: 700,
        font: preset.displayFont || 'Space Grotesk'
      },
      code: {
        style: 'glass-panel-inline'
      },
      quotes: {
        borderLeft: 'none',
        paddingLeft: '0',
        font: 'PingFang SC',
        fontStyle: 'normal',
        fontWeight: 500,
        fontSize: '28px',
        color: css['--text-primary'] || '#ffffff'
      },
      keyPoints: preset.panel ? {
        background: preset.panel.background || 'rgba(0,0,0,0.6)',
        border: preset.panel.border || `1px solid ${accentRaw}40`,
        borderTop: preset.panel.borderTop || `1px solid ${accentRaw}20`,
        borderBottom: preset.panel.borderBottom || '1px solid rgba(0,0,0,0.3)',
        borderRadius: '20px',
        padding: '28px 32px',
        textAlign: 'left',
        titleColor: accentLight
      } : null
    },
    layout_hint: preset.layoutHint || 'center_focus',
    design_mode: resolvedMode,
    preset_name: preset.name || resolvedMode,
    source: 'frontend-presets-fallback'
  };
}

function getDeepTechKeynotePreset() {
  return {
    colorScheme: {
      background: '#0b1020',
      backgroundGradient: 'radial-gradient(circle at 20% 15%, rgba(83,120,255,0.16) 0%, rgba(11,16,32,0) 28%), linear-gradient(180deg, #0b1020 0%, #0e1428 55%, #0a0f1d 100%)',
      primary: '#dce7ff',
      accent: '#7cc7ff',
      textPrimary: '#f5f7fb',
      textSecondary: '#9aa7bd',
      border: 'rgba(255,255,255,0.12)',
      panel: 'rgba(18,24,44,0.75)',
      panelBorder: 'rgba(140,170,255,0.20)',
      panelHighlight: 'rgba(255,255,255,0.10)'
    },
    typography: {
      title: { font: 'Space Grotesk', coverSize: 78, sectionSize: 58, weight: 700, letterSpacing: '-0.03em', lineHeight: 1.08 },
      body: { font: 'PingFang SC', size: 22, lineHeight: 1.55, weight: 400 },
      code: { font: 'JetBrains Mono', size: 18, background: 'rgba(113,164,255,0.10)', border: '1px solid rgba(113,164,255,0.22)', borderRadius: '10px' }
    },
    decoration: {
      glow: { count: 1, color: '#5d8bff', size: '680px', blur: '180px', opacity: 0.12, position: { top: '-160px', right: '-120px' } },
      panel: {
        enabled: true,
        background: 'rgba(18,24,44,0.75)',
        border: '1px solid rgba(140,170,255,0.20)',
        borderTop: '1px solid rgba(200,220,255,0.12)',
        borderBottom: '1px solid rgba(0,0,0,0.25)',
        shadow: '0 20px 60px rgba(0,0,0,0.40), 0 4px 12px rgba(0,0,0,0.20)',
        innerGlow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
        rimLight: 'inset 0 1px 0 rgba(200,220,255,0.08)',
        radius: '24px',
        blur: '8px'
      },
      hairline: { enabled: true, color: 'rgba(124,199,255,0.35)' }
    },
    specialElements: {
      numbers: { size: '56-72px', color: '#9fd7ff', weight: 700, font: 'Space Grotesk' },
      code: { style: 'glass-panel-inline' },
      quotes: { borderLeft: 'none', paddingLeft: '0', font: 'PingFang SC', fontStyle: 'normal', fontWeight: 500, fontSize: '28px', color: '#dce7ff' },
      keyPoints: { background: 'rgba(18,24,44,0.75)', border: '1px solid rgba(140,170,255,0.20)', borderTop: '1px solid rgba(200,220,255,0.10)', borderBottom: '1px solid rgba(0,0,0,0.25)', borderRadius: '20px', padding: '28px 32px', textAlign: 'left', titleColor: '#9fd7ff' }
    },
    layout_hint: 'left_text_right_space',
    design_mode: PROFESSIONAL_MODE,
    preset_name: 'Deep Tech Keynote',
    source: 'professional-keynote'
  };
}
