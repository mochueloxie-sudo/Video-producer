/**
 * HTML Generator for slide-forge
 * 直接复制样张 HTML 结构，替换内容 tokens
 * 样张路径: samples/{design_mode}/cover.html | content.html
 */
const fs = require('fs');
const path = require('path');
const { mergeAnimationIntoHtml, normalizePreset } = require('./page_animations');

// 每个模板的精确 CSS 值（从样张提取）
const DESIGN_TEMPLATES = {
  'electric-studio': {
    font: 'Manrope',
    bodyBg: '#0a0a0a',
    textColor: '#ffffff',
    accent: '#4361ee',
    accentLight: '#7cc7ff',
    textSecondary: '#c8d0e8',
    textMuted: '#8890a8',
    panelBg: 'rgba(20,20,20,0.82)',
    panelBorder: '1px solid rgba(67,97,238,0.30)',
    panelBorderTop: '1px solid rgba(255,255,255,0.18)',
    panelBorderBottom: '1px solid rgba(0,0,0,0.35)',
    panelShadow: '0 28px 72px rgba(0,0,0,0.60), 0 8px 24px rgba(67,97,238,0.18), inset 0 1px 0 rgba(255,255,255,0.10)',
    panelInnerGlow: 'inset 0 1px 0 rgba(100,130,255,0.12)',
    panelBlur: '20px) saturate(170%',
    panelRadius: '16px',
    hairlineColor: 'rgba(100,130,255,0.35)',
    eyebrowColor: '#4361ee',
    titleSize: { cover: '80px', section: '58px', summary: '58px' },
  },
  'bold-signal': {
    font: 'Space Grotesk',
    bodyBg: '#1a1a1a',
    textColor: '#ffffff',
    accent: '#FF5722',
    accentLight: '#FF8A65',
    textSecondary: '#c8d0e8',
    textMuted: '#888888',
    panelBg: 'rgba(35,35,35,0.80)',
    panelBorder: '1px solid rgba(255,87,34,0.25)',
    panelBorderTop: '1px solid rgba(255,255,255,0.17)',
    panelBorderBottom: '1px solid rgba(0,0,0,0.35)',
    panelShadow: '0 28px 72px rgba(0,0,0,0.58), 0 8px 24px rgba(255,87,34,0.15), inset 0 1px 0 rgba(255,255,255,0.10)',
    panelInnerGlow: 'inset 0 1px 0 rgba(255,150,100,0.12)',
    panelBlur: '20px) saturate(170%',
    panelRadius: '20px',
    hairlineColor: 'rgba(255,87,34,0.35)',
    eyebrowColor: '#FF5722',
    titleSize: { cover: '72px', section: '64px', summary: '64px' },
  },
  'creative-voltage': {
    font: 'Manrope',
    bodyBg: '#1a1a2e',
    textColor: '#ffffff',
    accent: '#d4ff00',
    accentLight: '#4dabf7',
    textSecondary: '#c8d0e8',
    textMuted: '#787a96',
    panelBg: 'rgba(26,26,46,0.85)',
    panelBorder: '1px solid rgba(0,102,255,0.30)',
    panelBorderTop: '1px solid rgba(255,255,255,0.18)',
    panelBorderBottom: '1px solid rgba(0,0,0,0.35)',
    panelShadow: '0 28px 72px rgba(0,0,0,0.60), 0 8px 24px rgba(0,102,255,0.18), 0 0 0 0.5px rgba(212,255,0,0.10), inset 0 1px 0 rgba(255,255,255,0.10)',
    panelInnerGlow: 'inset 0 1px 0 rgba(212,255,0,0.08)',
    panelBlur: '20px) saturate(170%',
    panelRadius: '16px',
    hairlineColor: 'rgba(212,255,0,0.35)',
    eyebrowColor: '#d4ff00',
    titleSize: { cover: '72px', section: '58px', summary: '58px' },
  },
  'dark-botanical': {
    font: 'Cormorant',
    bodyBg: '#0f0f0f',
    textColor: '#e8e4df',
    accent: '#d4a574',
    accentLight: '#e8c9a0',
    textSecondary: '#b0b0a0',
    textMuted: '#8a8070',
    panelBg: 'rgba(25,25,22,0.82)',
    panelBorder: '1px solid rgba(212,165,116,0.25)',
    panelBorderTop: '1px solid rgba(255,255,255,0.16)',
    panelBorderBottom: '1px solid rgba(0,0,0,0.35)',
    panelShadow: '0 28px 72px rgba(0,0,0,0.58), 0 8px 24px rgba(212,165,116,0.14), inset 0 1px 0 rgba(255,255,255,0.10)',
    panelInnerGlow: 'inset 0 1px 0 rgba(232,180,168,0.10)',
    panelBlur: '20px) saturate(165%',
    panelRadius: '20px',
    hairlineColor: 'rgba(212,165,116,0.35)',
    eyebrowColor: '#d4a574',
    titleSize: { cover: '64px', section: '58px', summary: '58px' },
  },
  'neon-cyber': {
    font: 'Orbitron',
    bodyBg: '#0a0a0a',
    textColor: '#ffffff',
    accent: '#8b5cf6',
    accentLight: '#00f5d4',
    textSecondary: '#b8b8cc',
    textMuted: '#686880',
    panelBg: 'rgba(15,15,20,0.85)',
    panelBorder: '1px solid rgba(139,92,246,0.30)',
    panelBorderTop: '1px solid rgba(255,255,255,0.20)',
    panelBorderBottom: '1px solid rgba(0,0,0,0.35)',
    panelShadow: '0 28px 72px rgba(0,0,0,0.65), 0 8px 28px rgba(139,92,246,0.25), 0 0 40px rgba(0,245,212,0.08), inset 0 1px 0 rgba(255,255,255,0.12)',
    panelInnerGlow: 'inset 0 1px 0 rgba(0,245,212,0.10)',
    panelBlur: '20px) saturate(180%',
    panelRadius: '12px',
    hairlineColor: 'rgba(139,92,246,0.35)',
    eyebrowColor: '#8b5cf6',
    titleSize: { cover: '64px', section: '52px', summary: '52px' },
    titleShadow: '0 0 30px rgba(139,92,246,0.4)',
  },
  'terminal-green': {
    font: 'JetBrains Mono',
    bodyBg: '#0d1117',
    textColor: '#c9d1d9',
    accent: '#39d353',
    accentLight: '#58a6ff',
    textSecondary: '#b0b8c4',
    textMuted: '#586470',
    panelBg: 'rgba(22,27,34,0.88)',
    panelBorder: '1px solid rgba(57,211,83,0.25)',
    panelBorderTop: '1px solid rgba(255,255,255,0.15)',
    panelBorderBottom: '1px solid rgba(0,0,0,0.40)',
    panelShadow: '0 28px 72px rgba(0,0,0,0.62), 0 8px 24px rgba(57,211,83,0.14), inset 0 1px 0 rgba(255,255,255,0.10)',
    panelInnerGlow: 'inset 0 1px 0 rgba(88,166,255,0.08)',
    panelBlur: '20px) saturate(165%',
    panelRadius: '10px',
    hairlineColor: 'rgba(57,211,83,0.25)',
    eyebrowColor: '#39d353',
    titleSize: { cover: '56px', section: '52px', summary: '52px' },
  },
  'deep-tech-keynote': {
    font: 'Space Grotesk',
    bodyBg: '#0b1020',
    textColor: '#f5f7fb',
    accent: '#7cc7ff',
    accentLight: '#9fd7ff',
    textSecondary: '#dce7ff',
    textMuted: '#9aa7bd',
    panelBg: 'rgba(18,24,44,0.80)',
    panelBorder: '1px solid rgba(124,199,255,0.25)',
    panelBorderTop: '1px solid rgba(255,255,255,0.18)',
    panelBorderBottom: '1px solid rgba(0,0,0,0.35)',
    panelShadow: '0 28px 72px rgba(0,0,0,0.58), 0 8px 24px rgba(124,199,255,0.18), inset 0 1px 0 rgba(255,255,255,0.10)',
    panelInnerGlow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
    panelBlur: '20px) saturate(165%',
    panelRadius: '16px',
    hairlineColor: 'rgba(124,199,255,0.35)',
    eyebrowColor: '#7cc7ff',
    splitTop: '#ffffff',
    splitBottom: '#4361ee',
    titleSize: { cover: '80px', section: '58px', summary: '58px' },
    coverTitleColor: '#0b1020',
  },

  // ── 实验主题（已升级为官方同等级别）──────────────────────────────────────
  'notebook-tabs': {
    font: 'DM Sans',
    bodyBg: '#2d2d2d',
    textColor: '#1a1a1a',
    accent: '#98d4bb',
    accentLight: '#c7b8ea',
    textSecondary: '#3a3a3a',
    textMuted: '#b0aa9e',
    panelBg: '#ffffff',
    panelBorder: '1px solid #d8d2c8',
    panelBorderTop: '1px solid #d8d2c8',
    panelBorderBottom: '1px solid #d8d2c8',
    panelShadow: '0 2px 12px rgba(0,0,0,0.06)',
    panelInnerGlow: 'none',
    panelBlur: '0px',
    panelRadius: '4px',
    hairlineColor: '#d8d2c8',
    eyebrowColor: '#98d4bb',
    titleSize: { cover: '72px', section: '56px', summary: '56px' },
  },
  'paper-ink': {
    font: 'Source Serif 4',
    bodyBg: '#faf9f7',
    textColor: '#1a1a1a',
    accent: '#c41e3a',
    accentLight: '#e85d75',
    textSecondary: '#3a3a3a',
    textMuted: '#888080',
    panelBg: '#ffffff',
    panelBorder: '1px solid #d8d2c8',
    panelBorderTop: '3px solid #c41e3a',
    panelBorderBottom: '1px solid #d8d2c8',
    panelShadow: '0 2px 16px rgba(0,0,0,0.06)',
    panelInnerGlow: 'none',
    panelBlur: '0px',
    panelRadius: '4px',
    hairlineColor: 'rgba(196,30,58,0.2)',
    eyebrowColor: '#c41e3a',
    titleSize: { cover: '72px', section: '56px', summary: '56px' },
  },
  'pastel-geometry': {
    font: 'Poppins',
    bodyBg: '#fafafa',
    textColor: '#2d2d2d',
    accent: '#cc7a9a',
    accentLight: '#f4b8c5',
    textSecondary: '#4a4a4a',
    textMuted: '#9a9a9a',
    panelBg: '#ffffff',
    panelBorder: '1px solid rgba(204,122,154,0.2)',
    panelBorderTop: '1px solid rgba(204,122,154,0.2)',
    panelBorderBottom: '1px solid rgba(204,122,154,0.2)',
    panelShadow: '0 4px 24px rgba(204,122,154,0.08)',
    panelInnerGlow: 'none',
    panelBlur: '0px',
    panelRadius: '16px',
    hairlineColor: 'rgba(204,122,154,0.2)',
    eyebrowColor: '#cc7a9a',
    titleSize: { cover: '68px', section: '52px', summary: '52px' },
  },
  'split-pastel': {
    font: 'Nunito',
    bodyBg: '#ffd6ec',
    textColor: '#2d2d2d',
    accent: '#cc6b8e',
    accentLight: '#87ceeb',
    textSecondary: '#4a4a4a',
    textMuted: '#9a9a9a',
    panelBg: '#ffffff',
    panelBorder: '1px solid rgba(204,107,142,0.2)',
    panelBorderTop: '1px solid rgba(204,107,142,0.2)',
    panelBorderBottom: '1px solid rgba(204,107,142,0.2)',
    panelShadow: '0 4px 24px rgba(204,107,142,0.1)',
    panelInnerGlow: 'none',
    panelBlur: '0px',
    panelRadius: '20px',
    hairlineColor: 'rgba(204,107,142,0.25)',
    eyebrowColor: '#cc6b8e',
    titleSize: { cover: '64px', section: '52px', summary: '52px' },
  },
  'swiss-modern': {
    font: 'Helvetica Neue',
    bodyBg: '#ffffff',
    textColor: '#1a1a1a',
    accent: '#ff3b30',
    accentLight: '#ff6b61',
    textSecondary: '#3a3a3a',
    textMuted: '#999999',
    panelBg: '#f8f8f8',
    panelBorder: '1px solid #e5e5e5',
    panelBorderTop: '4px solid #ff3b30',
    panelBorderBottom: '1px solid #e5e5e5',
    panelShadow: 'none',
    panelInnerGlow: 'none',
    panelBlur: '0px',
    panelRadius: '0px',
    hairlineColor: '#e5e5e5',
    eyebrowColor: '#ff3b30',
    titleSize: { cover: '80px', section: '64px', summary: '64px' },
  },
  'vintage-editorial': {
    font: 'Georgia',
    bodyBg: '#f5f3ee',
    textColor: '#2c2c2c',
    accent: '#8b7355',
    accentLight: '#a89070',
    textSecondary: '#4a4a4a',
    textMuted: '#9a9080',
    panelBg: '#faf8f4',
    panelBorder: '1px solid #d4d0c8',
    panelBorderTop: '1px solid #d4d0c8',
    panelBorderBottom: '1px solid #d4d0c8',
    panelShadow: '0 2px 12px rgba(139,115,85,0.08)',
    panelInnerGlow: 'none',
    panelBlur: '0px',
    panelRadius: '2px',
    hairlineColor: '#d4d0c8',
    eyebrowColor: '#8b7355',
    titleSize: { cover: '68px', section: '54px', summary: '54px' },
  },
};

function loadTemplateWithSource(designMode, templateName) {
  const theme = designMode || 'electric-studio';
  const tplPath = path.join(__dirname, '..', 'samples', theme, `${templateName}.html`);
  if (fs.existsSync(tplPath)) {
    return { html: fs.readFileSync(tplPath, 'utf8'), fromShared: false };
  }
  const sharedPath = path.join(__dirname, '..', 'samples', 'shared', `${templateName}.html`);
  if (fs.existsSync(sharedPath)) {
    return { html: fs.readFileSync(sharedPath, 'utf8'), fromShared: true };
  }
  return { html: null, fromShared: false };
}

function loadTemplate(designMode, templateName) {
  return loadTemplateWithSource(designMode, templateName).html;
}

/** Strip duplicate title; shell already has {{TITLE}}. */
function stripTitleFromHeadInner(headInner) {
  return String(headInner || '').replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '').trim();
}

/**
 * notebook-tabs + shared-only variant: wrap shared full document in theme .paper / .tabs shell.
 * Keeps a single <body> so layout_hint / density injection unchanged.
 */
function mergeNotebookTabsSharedIntoShell(sharedFullHtml) {
  const shellPath = path.join(__dirname, '..', 'samples', 'notebook-tabs', '_content_shell.html');
  if (!fs.existsSync(shellPath)) return sharedFullHtml;
  const headM = sharedFullHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyM = sharedFullHtml.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);
  if (!headM || !bodyM) return sharedFullHtml;
  const headFrag = stripTitleFromHeadInner(headM[1]);
  const bodyInner = bodyM[2].trim();
  let shell = fs.readFileSync(shellPath, 'utf8');
  if (!shell.includes('__VP_SHARED_HEAD__') || !shell.includes('__VP_SHARED_BODY__')) {
    return sharedFullHtml;
  }
  return shell.split('__VP_SHARED_HEAD__').join(headFrag).split('__VP_SHARED_BODY__').join(bodyInner);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Stagger preset only: mark block + inline delay (avoids brittle :nth-child across mixed DOM). */
function vpBlockAnimAttrs(designParams, index, existingStyle) {
  const extra = existingStyle ? String(existingStyle).trim() : '';
  if (!designParams || designParams.page_animations === false) {
    return extra ? ` style="${extra}"` : '';
  }
  if (normalizePreset(designParams.page_animation_preset) !== 'stagger') {
    return extra ? ` style="${extra}"` : '';
  }
  const i = Math.min(Math.max(Number(index) || 0, 0), 14);
  const delay = i * 0.06 + 0.04;
  const style = extra ? `${extra};animation-delay:${delay}s` : `animation-delay:${delay}s`;
  return ` data-vp-animate style="${style}"`;
}

/** After KEY_POINT / {{BODY}} line-repeat: inject stagger on the first opening tag of each line. */
function injectVpAnimOnFirstOpeningTag(line, designParams, index) {
  const raw = vpBlockAnimAttrs(designParams, index);
  if (!raw.trim()) return line;
  return line.replace(/^(\s*<)([a-zA-Z][\w-]*)/, (_, lead, tag) => `${lead}${tag}${raw}`);
}

/**
 * S2: 克制 hover（panel / icon_grid / card_grid）。
 * 不用 transform/filter：与 [data-vp-animate] 入场动画的 transform 冲突，hover 会被 forwards 盖住。
 */
function getVariantInteractiveHoverStyleBlock(variant) {
  if (variant === 'panel') {
    return `<style id="vp-variant-hover">
@media (hover: hover) and (pointer: fine) {
  .panel ul.kp-list > li.kp-item {
    transition: outline-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
    outline: 2px solid transparent;
    outline-offset: 2px;
    border-radius: 10px;
  }
  .panel ul.kp-list > li.kp-item:hover {
    outline-color: rgba(255,255,255,0.28);
    background-color: rgba(255,255,255,0.06);
    box-shadow: 0 6px 24px rgba(0,0,0,0.22);
  }
}
</style>`;
  }
  if (variant === 'icon_grid') {
    return `<style id="vp-variant-hover">
@media (hover: hover) and (pointer: fine) {
  .grid .icon-card {
    transition: outline-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    outline: 2px solid transparent;
    outline-offset: 3px;
  }
  .grid .icon-card:hover {
    outline-color: rgba(255,255,255,0.32);
    box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  }
}
</style>`;
  }
  if (variant === 'card_grid') {
    return `<style id="vp-variant-hover">
@media (hover: hover) and (pointer: fine) {
  .grid > .card {
    transition: outline-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    outline: 2px solid transparent;
    outline-offset: 3px;
  }
  .grid > .card:hover {
    outline-color: rgba(255,255,255,0.3);
    box-shadow: 0 14px 48px rgba(0,0,0,0.38);
  }
}
</style>`;
  }
  return '';
}

function replaceTokens(html, tokens) {
  let result = html;
  for (const [key, value] of Object.entries(tokens)) {
    result = result.split(`{{${key}}}`).join(value);
  }
  return result;
}

// ── Content density engine ──────────────────────────────────────────────────

/**
 * Score the content richness of a scene.
 * Returns 'sparse' / 'normal' / 'rich'.
 */
function computeDensity(scene) {
  let chars = 0;
  const addText = (v) => { chars += (String(v || '')).length; };

  addText(scene.title);
  addText(scene.eyebrow);

  // body / quote / code
  const body = Array.isArray(scene.body) ? scene.body.join(' ') : (scene.body || '');
  chars += body.length;
  addText(scene.quote_body);
  addText(scene.code_snippet);
  addText(scene.context_body);

  // structured content — each item contributes weighted chars
  const kp    = (scene.key_points || []);
  const stats = (scene.stats      || []);
  const steps = (scene.steps      || []);
  const icons = (scene.icons      || []);
  const cards = (scene.cards      || []);

  // structural items: text chars + per-item visual weight bonus
  kp.forEach(k  => { addText(k); chars += 18; });       // each bullet occupies visual space
  stats.forEach(s => { addText(s.number); addText(s.label); chars += 30; });
  steps.forEach(s => { addText(s.label);  addText(s.desc);  chars += 28; });
  (scene.process_stages || []).forEach(s => { addText(s.label); addText(s.desc); chars += 28; });
  (scene.flow_lanes || []).forEach(l => {
    addText(l.lane_label || l.label);
    (l.cells || l.steps || []).forEach(c => { addText(c.label || c.title); addText(c.desc); chars += 24; });
  });
  (scene.layers || []).forEach(l => { addText(l.title); addText(l.desc); chars += 32; });
  (scene.funnel_stages || []).forEach(f => { addText(f.label); addText(f.desc); chars += 26; });
  (scene.compare_left_points || []).forEach(addText);
  (scene.compare_right_points || []).forEach(addText);
  icons.forEach(i => { addText(i.label);  chars += 22; });
  cards.forEach(c => { addText(c.title);  addText(c.body);  chars += 35; });

  // covers / summaries always get breathing room
  if (['cover', 'summary', 'end'].includes(scene.type)) return 'sparse';

  if (chars < 70)  return 'sparse';
  if (chars < 160) return 'normal';
  return 'rich';
}

/**
 * Universal readability baseline — injected on EVERY page.
 * Raises non-title text from template defaults to comfortable
 * reading sizes at 1920×1080 presentation resolution.
 */
function getReadabilityCSS() {
  return `
  /* slide-forge: 1920×1080 readability baseline */
  .body-text, p.body-text         { font-size: 28px !important; line-height: 1.68 !important; }
  .kp-item span:last-child,
  .kp-item > span:not(.kp-arrow):not(.kp-dot):not(.kp-num) { line-height: 1.55 !important; }
  /* ── panel kp-item boxes (layout-grid-3: auto-height, use larger fixed size) ── */
  .kp-title                       { font-size: 36px !important; font-weight: 600 !important; line-height: 1.3 !important; }
  .kp-desc                        { font-size: 22px !important; line-height: 1.58 !important; opacity: 0.75 !important; }
  .step-label                     { font-size: 28px !important; }
  .step-desc                      { font-size: 20px !important; line-height: 1.55 !important; }
  .stat-label                     { font-size: 24px !important; }
  .stat-desc                      { font-size: 18px !important; }
  .stat-name                      { font-size: 26px !important; }
  .icon-label                     { font-size: 26px !important; }
  .icon-desc                      { font-size: 17px !important; line-height: 1.5 !important; }
  .panel-title                    { font-size: 28px !important; }
  .card-body                      { font-size: 21px !important; line-height: 1.55 !important; }
  .card-title                     { font-size: 26px !important; }
  .nav-item                       { font-size: 18px !important; }
  .context-text                   { font-size: 22px !important; line-height: 1.65 !important; }
  .compare-list li                { font-size: 24px !important; }
  .pf-label                       { font-size: 22px !important; }
  .pf-desc                        { font-size: 18px !important; line-height: 1.55 !important; }
  .arch-layer-title               { font-size: 28px !important; }
  .arch-layer-desc                { font-size: 20px !important; line-height: 1.55 !important; }
  .fn-label                       { font-size: 26px !important; }
  .fn-desc                        { font-size: 19px !important; line-height: 1.5 !important; }
  .bullet-text                    { font-size: 26px !important; line-height: 1.5 !important; }
  .bullet-desc                    { font-size: 19px !important; line-height: 1.58 !important; opacity: 0.75 !important; }
  .quote-text                     { font-size: 50px !important; }
  .attr-name                      { font-size: 22px !important; }
  .attr-title                     { font-size: 16px !important; }
  /* layout-grid-3 / layout-cards: center the grid rows inside the flex-1 panel ── */
  /* flex:1 overrides template's flex:unset so kp-list still fills the panel height */
  body.layout-grid-3 .kp-list { flex: 1 !important; align-content: center !important; }
  body.layout-cards  .kp-list { flex: 1 !important; justify-content: center !important; }
  /* each kp-item box: content centered inside */
  body.layout-grid-3 .kp-item,
  body.layout-cards .kp-item  {
    justify-content: center !important;
    align-items: center !important;
    text-align: center !important;
  }
  /* ── number_bullets & layout-cards: container-query-based auto-scaling ───────
     cqh = % of the container's height, so text scales with card size            */
  .bullet-item        { container-type: size !important; align-items: center !important; }
  .bullet-text-wrap   { justify-content: center !important; flex: 1 !important; }
  .bullet-num         { font-size: clamp(52px, 11cqh, 88px) !important; line-height: 1 !important; align-self: center !important; }
  .bullet-text        { font-size: clamp(30px, 7cqh, 56px)  !important; font-weight: 600 !important; line-height: 1.3 !important; }
  .bullet-desc        { font-size: clamp(18px, 4cqh, 34px)  !important; line-height: 1.55 !important; }
  /* layout-cards kp-item: has fixed height from flex:1, can use container queries */
  body.layout-cards .kp-item { container-type: size !important; }
  body.layout-cards .kp-title { font-size: clamp(28px, 10cqh, 50px) !important; }
  body.layout-cards .kp-desc  { font-size: clamp(17px, 6cqh,  30px) !important; }
  /* stat-cards in stats_grid: center inner content */
  .stat-card                   { justify-content: center !important; }
  /* two-col panels: center inner content vertically */
  .col-left, .col-right        { justify-content: center !important; }
  /* vp-footnote: injected at bottom of every page when scene.footnote is set */
  .vp-footnote {
    position: absolute !important; bottom: 52px !important;
    left: 120px !important; right: 120px !important;
    font-size: 20px !important; font-style: italic !important;
    opacity: 0.52 !important; line-height: 1.5 !important;
    pointer-events: none; z-index: 9;
  }`;
}

/**
 * Title & subtitle size enhancement — injected per-page.
 * cover: only bumps .subtitle (main title is already 96px+).
 * content/summary: bumps .title from ~52-58px range → 72px,
 *                  and .secondary / sub-headers proportionally.
 */
function getTitleEnhancementCSS(pageType) {
  if (pageType === 'cover') {
    return `
  /* ── Title scale · cover ────────────────────────────────────────── */
  /* main .title kept at theme value (96px+); only subtitle is bumped */
  .subtitle, .cover-subtitle {
    font-size: 34px !important; line-height: 1.45 !important;
    letter-spacing: 0.01em !important;
  }
`;
  }
  // content + summary
  // Use body selector for higher specificity so it wins over density-rich .title
  return `
  /* ── Title scale · content/summary ─────────────────────────────── */
  body .title {
    font-size: 72px !important; line-height: 1.05 !important;
    margin-bottom: 40px !important;
  }
  body.density-rich .title {
    font-size: clamp(54px, 3.5vw, 68px) !important;
  }
  body .secondary {
    font-size: 32px !important; line-height: 1.45 !important;
    margin-bottom: 28px !important;
  }
`;
}

/**
 * Glass & liquid enhancement CSS — injected per-page, theme-aware.
 * Dark themes: stronger backdrop-filter, ::before shimmer, colored shadows.
 * Light themes: depth shadows + top-gloss border.
 */
function getGlassEnhancementCSS(tpl) {
  if (!tpl) return '';

  const bg = (tpl.bodyBg || '').toLowerCase();
  const isDark = !bg.startsWith('#f') && !bg.startsWith('rgba(255') &&
                 bg !== '#ffffff' && !bg.startsWith('#fff');

  // Parse accent hex → "r,g,b" for rgba() usage
  let accentRgb = '100,130,255';
  const hexM = (tpl.accent || '').match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hexM) accentRgb = `${parseInt(hexM[1],16)},${parseInt(hexM[2],16)},${parseInt(hexM[3],16)}`;

  // Numbered card styling — theme-aware accent color, works for both dark & light
  const numCardCSS = `
  /* ── Numbered card (card.number field) ─────────────────────────── */
  .card-num {
    font-size: 56px !important; font-weight: 900 !important;
    color: ${tpl.accent || '#6366f1'} !important;
    line-height: 1 !important; letter-spacing: -0.03em !important;
    margin-bottom: 16px !important; font-variant-numeric: tabular-nums !important;
  }
  .card-numbered { justify-content: flex-start !important; padding-top: 40px !important; }
  body.layout-2x2 .card-num { font-size: 72px !important; }
`;

  if (isDark) {
    return numCardCSS + `
  /* ── Glass & liquid enhancement · dark theme ────────────────────── */

  /* 1. Stronger backdrop blur + saturation on all glass elements */
  .card, .icon-card, .stat-card, .content-block, .panel-glass {
    backdrop-filter: blur(24px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  }

  /* 2. Deepen shadows with ambient accent glow */
  .card {
    box-shadow:
      0 32px 80px rgba(0,0,0,0.60),
      0 8px 20px rgba(${accentRgb},0.10),
      inset 0 1px 0 rgba(255,255,255,0.14),
      inset 0 -1px 0 rgba(0,0,0,0.25) !important;
    position: relative !important;
    overflow: hidden !important;
  }
  .icon-card {
    box-shadow:
      0 16px 48px rgba(0,0,0,0.50),
      0 4px 12px rgba(${accentRgb},0.10),
      inset 0 1px 0 rgba(255,255,255,0.13) !important;
    position: relative !important;
    overflow: hidden !important;
  }
  .stat-card {
    box-shadow:
      0 24px 64px rgba(0,0,0,0.55),
      0 4px 16px rgba(${accentRgb},0.10),
      inset 0 1px 0 rgba(255,255,255,0.12) !important;
  }

  /* 3. Liquid shimmer: diagonal light refraction via ::before overlay */
  .card::before, .icon-card::before {
    content: '' !important;
    position: absolute !important; inset: 0 !important;
    border-radius: inherit !important;
    background: linear-gradient(
      135deg,
      rgba(255,255,255,0.08) 0%,
      rgba(255,255,255,0.03) 35%,
      transparent 60%
    ) !important;
    pointer-events: none !important;
  }

  /* 4. Top-edge light catch — liquid glass "rim" highlight */
  .card {
    border-top: 1px solid rgba(255,255,255,0.18) !important;
  }
  .icon-card {
    border-top: 1px solid rgba(255,255,255,0.16) !important;
  }

  /* 5. Subtle bottom ambient glow on page body */
  body::after {
    content: '' !important;
    position: fixed !important;
    bottom: -200px !important; left: 50% !important;
    transform: translateX(-50%) !important;
    width: 1200px !important; height: 600px !important;
    background: radial-gradient(ellipse at center, rgba(${accentRgb},0.06) 0%, transparent 70%) !important;
    pointer-events: none !important; z-index: 0 !important;
  }
`;
  } else {
    // Light theme — subtle depth: no blur but nice depth shadows + gloss
    return numCardCSS + `
  /* ── Glass & liquid enhancement · light theme ───────────────────── */
  .card {
    box-shadow:
      0 8px 32px rgba(0,0,0,0.10),
      0 2px 8px rgba(0,0,0,0.06),
      inset 0 1px 0 rgba(255,255,255,0.95),
      inset 0 -1px 0 rgba(0,0,0,0.05) !important;
  }
  .icon-card {
    box-shadow:
      0 6px 24px rgba(0,0,0,0.09),
      0 2px 6px rgba(0,0,0,0.05),
      inset 0 1px 0 rgba(255,255,255,0.90) !important;
  }
  .stat-card {
    box-shadow:
      0 6px 24px rgba(0,0,0,0.08),
      inset 0 1px 0 rgba(255,255,255,0.85) !important;
  }
  /* Softer card edges for airy feel */
  .card, .icon-card { border-radius: 20px !important; }
`;
  }
}

/**
 * Return a <style> block to inject into <head> for the given density.
 * Targets common class names used across templates; uses !important to
 * override hardcoded values without touching template files.
 */
function getDensityCSS(density) {
  if (density === 'sparse') return `
  /* ── adaptive: sparse content — scale up & breathe ── */
  body.density-sparse h1,
  body.density-sparse .title,
  body.density-sparse .cover-title,
  body.density-sparse .section-title {
    font-size: clamp(76px, 5.5vw, 96px) !important;
    line-height: 1.08 !important;
  }
  body.density-sparse .body-text,
  body.density-sparse .kp-item span:last-child,
  body.density-sparse .bullet-text { font-size: 34px !important; line-height: 1.75 !important; }
  body.density-sparse .quote-text   { font-size: 58px !important; line-height: 1.3 !important; }
  body.density-sparse .kp-list,
  body.density-sparse .bullets      { justify-content: center !important; gap: 36px !important; }
  body.density-sparse .panel        { justify-content: center !important; gap: 28px !important; padding-top: 40px !important; padding-bottom: 40px !important; }
  body.density-sparse .stat-number,
  body.density-sparse .big-number   { font-size: 180px !important; }
  body.density-sparse .stat-label,
  body.density-sparse .number-label { font-size: 30px !important; }
  body.density-sparse .step         { padding: 20px 0 !important; }
  body.density-sparse .step-label   { font-size: 32px !important; }
  body.density-sparse .step-desc    { font-size: 22px !important; }
  body.density-sparse .icon-card    { padding: 36px 20px !important; }
  body.density-sparse .icon-emoji   { font-size: 80px !important; }
  body.density-sparse .icon-label   { font-size: 30px !important; }
  body.density-sparse .icon-desc    { font-size: 20px !important; }`;

  if (density === 'rich') return `
  /* ── adaptive: rich content — compress & tighten ── */
  body.density-rich h1,
  body.density-rich .title { font-size: clamp(54px, 3.5vw, 68px) !important; line-height: 1.05 !important; margin-bottom: 18px !important; }
  body.density-rich .body-text { font-size: 20px !important; line-height: 1.55 !important; }
  body.density-rich .kp-item   { padding: 5px 0 !important; }
  body.density-rich .kp-item span:last-child { font-size: 20px !important; }
  body.density-rich .bullet-text { font-size: 20px !important; }
  body.density-rich .panel    { padding: 24px 32px !important; gap: 8px !important; }
  body.density-rich .eyebrow  { margin-bottom: 10px !important; }
  body.density-rich .step-label { font-size: 22px !important; }
  body.density-rich .step-desc  { font-size: 16px !important; }
  body.density-rich .icon-card  { padding: 16px 10px !important; max-height: 180px !important; }
  body.density-rich .icon-emoji { font-size: 48px !important; }
  body.density-rich .icon-label { font-size: 20px !important; }
  body.density-rich .icon-desc  { font-size: 15px !important; }`;

  return ''; // normal: no override needed
}

function buildTokens(scene, tpl, pageNum, totalPages) {
  const titleParts = (scene.title || '').split('<br>');
  const titleHtml = titleParts.length > 1
    ? titleParts.map(l => `<span>${escapeHtml(l.trim())}</span>`).join('<br>')
    : escapeHtml(scene.title || '');

  const eyebrow = escapeHtml(scene.eyebrow || scene.section_label || `Section ${String(pageNum).padStart(2,'0')}`);
  const subtitle = escapeHtml(scene.subtitle || scene.secondary || scene.body?.[0] || '');

  return {
    TITLE: titleHtml,
    SUBTITLE: subtitle,
    EYEBROW: eyebrow,
    PAGE_NUM: String(pageNum).padStart(2, '0'),
    TOTAL: String(totalPages).padStart(2, '0'),
    FONT: tpl.font,
    BODY_BG: tpl.bodyBg,
    TEXT_PRIMARY: tpl.textColor,
    TEXT_SECONDARY: tpl.textSecondary,
    TEXT_MUTED: tpl.textMuted,
    ACCENT: tpl.accent,
    ACCENT_LIGHT: tpl.accentLight,
    PANEL_BG: tpl.panelBg,
    PANEL_BORDER: tpl.panelBorder,
    PANEL_BORDER_TOP: tpl.panelBorderTop,
    PANEL_BORDER_BOTTOM: tpl.panelBorderBottom,
    PANEL_SHADOW: tpl.panelShadow,
    PANEL_INNER_GLOW: tpl.panelInnerGlow,
    PANEL_BLUR: tpl.panelBlur,
    PANEL_RADIUS: tpl.panelRadius,
    HAIRLINE_COLOR: tpl.hairlineColor,
    EYEBROW_COLOR: tpl.eyebrowColor,
    SPLIT_TOP: tpl.splitTop,
    SPLIT_BOTTOM: tpl.splitBottom,
    TITLE_SIZE: tpl.titleSize.section,
    COVER_TITLE_SIZE: tpl.titleSize.cover,
    COVER_TITLE_COLOR: tpl.coverTitleColor,
    TITLE_SHADOW: tpl.titleShadow || 'none',
    COVER_TITLE_ITALIC: tpl.coverTitleItalic ? 'italic' : 'normal',
  };
}

function generateCover(scene, tpl, designMode, pageNum, totalPages, designParams) {
  let html = loadTemplate(designMode || 'electric-studio', 'cover');
  if (!html) return null;
  const tokens = buildTokens(scene, tpl, pageNum, totalPages);
  tokens.TITLE_SIZE = tpl.titleSize.cover;
  // covers always use sparse density (breathing room is the cover's purpose)
  const coverScene = { ...scene, type: 'cover' };
  const density = computeDensity(coverScene);
  const classes = [
    scene.layout_hint ? `layout-${scene.layout_hint}` : null,
    density !== 'normal' ? `density-${density}` : null,
  ].filter(Boolean);
  if (classes.length > 0) {
    const classStr = classes.join(' ');
    html = html.replace(/<body([^>]*)>/i, (_, attrs) => {
      const m = attrs.match(/class="([^"]*)"/);
      return m
        ? `<body${attrs.replace(/class="[^"]*"/, `class="${m[1]} ${classStr}"`)}>` 
        : `<body${attrs} class="${classStr}">`;
    });
  }
  // Readability + density + glass + title scale
  const readCSS = getReadabilityCSS();
  const densityCSS = getDensityCSS(density);
  const glassCSS = getGlassEnhancementCSS(tpl);
  const titleCSS = getTitleEnhancementCSS('cover');
  html = html.replace('</head>', `<style>${readCSS}${densityCSS}${glassCSS}${titleCSS}\n  </style>\n</head>`);
  const footnoteText = scene.footnote || scene.annotation || '';
  if (footnoteText) {
    html = html.replace('</body>',
      `  <div class="vp-footnote">${escapeHtml(footnoteText)}</div>\n</body>`);
  }
  return mergeAnimationIntoHtml(replaceTokens(html, tokens), designParams);
}



function generateContent(scene, tpl, designMode, pageNum, totalPages, designParams) {
  // ── 1. Resolve variant → template file ─────────────────────────────────
  // Table fallback: if table_headers missing/empty, degrade to panel
  let variant = scene.content_variant || 'panel';
  if (variant === 'table' && (!scene.table_headers || !Array.isArray(scene.table_headers) || scene.table_headers.length === 0)) {
    variant = 'panel';
  }
  if (variant === 'compare') {
    const L = scene.compare_left_points || [];
    const R = scene.compare_right_points || [];
    if (!L.length || !R.length) variant = 'panel';
  }
  if (variant === 'process_flow') {
    const hasRail = (scene.process_stages || []).length || (scene.steps || []).length;
    const hasLane = (scene.flow_lanes || []).length;
    if (!hasLane && !hasRail) variant = 'panel';
  }
  if (variant === 'architecture_stack' && (!(scene.layers || []).length || scene.layers.length < 2)) {
    variant = 'panel';
  }
  if (variant === 'funnel' && (!(scene.funnel_stages || []).length || scene.funnel_stages.length < 2)) {
    variant = 'panel';
  }
  const variantMap = {
    'text':        '01_text_only',
    // LLM / Step0 may emit content_variant "summary" for closing slides; same slots as panel (key_points, etc.)
    'summary':     '02_panel',
    'panel':       '02_panel',
    'stats_grid':  '03_stats_grid',
    'number':      '04_number',
    'quote':       '05_quote',
    'hairline':    '06_hairline',
    'timeline':    '07_timeline',
    'two_col':     '08_two_col',
    'icon_grid':   '10_icon_grid',
    'code':        '11_code_block',
    'table':       '12_table',
    'card_grid':   '13_card_grid',
    'nav_bar':      '14_nav_bar',
    'chart':        '15_chart_demo',
    'panel_stat':   '16_panel_stat',
    'number_bullets':'17_number_bullets',
    'quote_context':'18_quote_context',
    'text_icons':   '19_text_icons',
    'compare':            '20_compare',
    'process_flow':       '21_process_flow',
    'architecture_stack': '22_architecture_stack',
    'funnel':             '23_funnel',
  };
  const designModeResolved = designMode || 'electric-studio';
  function loadContentTemplate(templateKey) {
    const { html: tplHtml, fromShared } = loadTemplateWithSource(designModeResolved, templateKey);
    if (!tplHtml) return null;
    if (designModeResolved === 'notebook-tabs' && fromShared) {
      return mergeNotebookTabsSharedIntoShell(tplHtml);
    }
    return tplHtml;
  }
  let html = loadContentTemplate(variantMap[variant] || 'content');
  if (!html) html = loadContentTemplate('content');
  if (!html) html = loadContentTemplate('01_text_only');
  if (!html) return null;

  // ── 2. Base tokens ───────────────────────────────────────────────────────
  const tokens = buildTokens(scene, tpl, pageNum, totalPages);
  tokens.PAGE_NUM = String(pageNum).padStart(2, '0');
  tokens.TOTAL    = String(totalPages).padStart(2, '0');

  // ── 2b. KEY_POINTS_HTML pre-rendered token (for 02_panel.html) ─────────────
  // Supports key_points[] + optional key_point_descs[] for title+body inside each box.
  if (html.includes('{{KEY_POINTS_HTML}}')) {
    const kps   = scene.key_points || [];
    const descs = scene.key_point_descs || [];
    tokens.KEY_POINTS_HTML = kps.map((kp, i) => {
      const desc = descs[i] || '';
      return [
        `<li class="kp-item"${vpBlockAnimAttrs(designParams, i)}>`,
        '  <span class="kp-arrow"></span>',
        '  <div class="kp-content">',
        `    <div class="kp-title">${escapeHtml(kp)}</div>`,
        desc ? `    <div class="kp-desc">${escapeHtml(desc)}</div>` : '',
        '  </div>',
        '</li>',
      ].filter(Boolean).join('\n');
    }).join('\n');
  }

  // ── 3. KEY_POINT repeat marker ────────────────────────────────────────────
  // Strategy: find the LINE containing {{KEY_POINT}}, repeat it per key_point.
  // Works with any HTML structure — no regex fragility on element shape.
  // (kept for panel_stat and other templates that still use single-line repeat)
  if (html.includes('{{KEY_POINT}}')) {
    const keyPoints = scene.key_points || [];
    keyPoints.forEach((kp, idx) => {
      tokens['KEY_POINT_' + idx] = escapeHtml(kp);
    });
    if (keyPoints.length > 0) {
      const lines = html.split('\n');
      const kpIdx = lines.findIndex(l => l.includes('{{KEY_POINT}}'));
      if (kpIdx >= 0) {
        const kpLine = lines[kpIdx];
        const repeated = keyPoints.map((kp, i) => {
          const filled = kpLine.replace('{{KEY_POINT}}', escapeHtml(kp));
          return injectVpAnimOnFirstOpeningTag(filled, designParams, i);
        });
        lines.splice(kpIdx, 1, ...repeated);
        html = lines.join('\n');
      }
    } else {
      // No key_points: remove the marker line entirely
      html = html.split('\n').filter(l => !l.includes('{{KEY_POINT}}')).join('\n');
    }
  }

  // ── 4. BODY repeat marker ────────────────────────────────────────────────
  // Strategy: find the LINE containing {{BODY}}, repeat it per body paragraph.
  if (html.includes('{{BODY}}')) {
    const bodyRaw = scene.body || [];
    const bodyLines = Array.isArray(bodyRaw) ? bodyRaw : String(bodyRaw).split(/\n\n+/).filter(Boolean);
    if (bodyLines.length > 0) {
      tokens.BODY = bodyLines.map(p => escapeHtml(p)).join(' <br> ');
      const lines = html.split('\n');
      const bodyIdx = lines.findIndex(l => l.includes('{{BODY}}'));
      if (bodyIdx >= 0) {
        const bodyLine = lines[bodyIdx];
        const repeated = bodyLines.map((p, i) => {
          const filled = bodyLine.replace('{{BODY}}', escapeHtml(p));
          return injectVpAnimOnFirstOpeningTag(filled, designParams, i);
        });
        lines.splice(bodyIdx, 1, ...repeated);
        html = lines.join('\n');
      }
    } else {
      tokens.BODY = '';
    }
  }

  // ── 5a. BODY_BG token (used by shared templates in <style>) ─────────────
  tokens.BODY_BG = tpl.bodyBg || '#0a0a0a';

  // ── 5b. New shared-template variant tokens ────────────────────────────────

  // stats_grid: STATS_HTML — pre-rendered stat cards
  if (scene.stats && Array.isArray(scene.stats)) {
    const statCount = scene.stats.length;
    tokens.STATS_HTML = scene.stats.map((s, idx) => {
      const val = String(s.number || '');
      const fullText = val + (s.unit || '');
      const len = fullText.length;
      let fontSize = '';
      if (statCount >= 4 && len > 3) fontSize = 'font-size:' + Math.max(42, Math.round(88 - (len - 3) * 12)) + 'px';
      else if (statCount >= 3 && len > 4) fontSize = 'font-size:' + Math.max(48, Math.round(88 - (len - 4) * 10)) + 'px';
      return [
        `<div class="stat-card"${vpBlockAnimAttrs(designParams, idx)}>`,
        `  <div class="stat-number"${fontSize ? ` style="${fontSize}"` : ''}>${escapeHtml(val)}` +
          (s.unit ? `<span class="stat-unit">${escapeHtml(s.unit)}</span>` : '') +
          '</div>',
        `  <div class="stat-label">${escapeHtml(s.label || '')}</div>`,
        s.desc ? `  <div class="stat-desc">${escapeHtml(s.desc)}</div>` : '',
        '</div>',
      ].filter(Boolean).join('\n');
    }).join('\n');
  } else {
    tokens.STATS_HTML = '';
  }

  // timeline: STEPS_HTML — pre-rendered step rows
  if (scene.steps && Array.isArray(scene.steps)) {
    tokens.STEPS_HTML = scene.steps.map((s, i) => [
      `<div class="step"${vpBlockAnimAttrs(designParams, i)}>`,
      '  <div class="step-dot"></div>',
      `  <div class="step-num">${String(i + 1).padStart(2, '0')}</div>`,
      '  <div class="step-content">',
      `    <div class="step-label">${escapeHtml(s.label || s.title || '')}</div>`,
      s.desc ? `    <div class="step-desc">${escapeHtml(s.desc)}</div>` : '',
      '  </div>',
      '</div>',
    ].filter(Boolean).join('\n')).join('\n');
  } else {
    tokens.STEPS_HTML = '';
  }

  // two_col: LEFT_BODY + RIGHT_LABEL + RIGHT_POINTS
  const leftBodyRaw = scene.left_body || scene.body || [];
  const leftBodyArr = Array.isArray(leftBodyRaw) ? leftBodyRaw : String(leftBodyRaw).split(/\n\n+/).filter(Boolean);
  tokens.LEFT_BODY = leftBodyArr
    .map(p => `<p class="body-text">${escapeHtml(p)}</p>`).join('\n      ');
  tokens.RIGHT_LABEL = escapeHtml(scene.right_label || '要点');
  tokens.RIGHT_POINTS = (scene.right_points || scene.key_points || [])
    .map((p, ri) => `<li class="kp-item"${vpBlockAnimAttrs(designParams, ri)}><span class="kp-arrow">›</span><span>${escapeHtml(p)}</span></li>`)
    .join('\n        ');

  // compare (20)
  tokens.COMPARE_LEFT_TITLE = escapeHtml(scene.compare_left_title || scene.compare_left_label || '方案 A');
  tokens.COMPARE_RIGHT_TITLE = escapeHtml(scene.compare_right_title || scene.compare_right_label || '方案 B');
  tokens.COMPARE_CENTER_LABEL = escapeHtml(scene.compare_center_label || 'VS');
  const clp = scene.compare_left_points || [];
  const crp = scene.compare_right_points || [];
  tokens.COMPARE_LEFT_POINTS = clp.map((p, i) =>
    `<li${vpBlockAnimAttrs(designParams, i)}><span class="compare-dot"></span><span>${escapeHtml(p)}</span></li>`
  ).join('\n');
  tokens.COMPARE_RIGHT_POINTS = crp.map((p, i) =>
    `<li${vpBlockAnimAttrs(designParams, clp.length + i)}><span class="compare-dot"></span><span>${escapeHtml(p)}</span></li>`
  ).join('\n');

  // process_flow (21)
  let pfStages = Array.isArray(scene.process_stages) ? scene.process_stages : [];
  if (variant === 'process_flow' && pfStages.length === 0 && Array.isArray(scene.steps) && scene.steps.length) {
    pfStages = scene.steps.map(s => ({
      label: s.label || s.title || '',
      desc: s.desc || '',
    }));
  }
  const pfLanes = Array.isArray(scene.flow_lanes) ? scene.flow_lanes : [];
  tokens.PROCESS_RAIL_HTML = pfStages.map((s, i) => [
    '<div class="pf-stage">',
    '  <div class="pf-node"></div>',
    `  <div class="pf-card"${vpBlockAnimAttrs(designParams, i)}>`,
    `    <div class="pf-label">${escapeHtml(s.label || '')}</div>`,
    s.desc ? `    <div class="pf-desc">${escapeHtml(s.desc)}</div>` : '',
    '  </div>',
    '</div>',
  ].filter(Boolean).join('\n')).join('\n');
  tokens.PROCESS_SWIMLANES_HTML = pfLanes.map((lane, li) => {
    const cells = Array.isArray(lane.cells) ? lane.cells : (Array.isArray(lane.steps) ? lane.steps : []);
    const cellsHtml = cells.map((c, ci) => {
      const inner = [
        `      <div class="pf-label">${escapeHtml(c.label || c.title || '')}</div>`,
        c.desc ? `      <div class="pf-desc">${escapeHtml(c.desc)}</div>` : '',
      ].filter(Boolean).join('\n');
      return `    <div class="pf-cell"${vpBlockAnimAttrs(designParams, li * 8 + ci)}>\n${inner}\n    </div>`;
    }).join('\n');
    return [
      '<div class="pf-lane">',
      `  <div class="pf-lane-label">${escapeHtml(lane.lane_label || lane.label || '')}</div>`,
      '  <div class="pf-lane-track">',
      cellsHtml,
      '  </div>',
      '</div>',
    ].join('\n');
  }).join('\n');

  // architecture_stack (22)
  const archLayers = Array.isArray(scene.layers) ? scene.layers : [];
  tokens.ARCH_LAYERS_HTML = archLayers.map((layer, i) => [
    `<div class="arch-layer"${vpBlockAnimAttrs(designParams, i)}>`,
    '  <div class="arch-accent"></div>',
    '  <div class="arch-inner">',
    `    <div class="arch-layer-title">${escapeHtml(layer.title || layer.label || '')}</div>`,
    layer.desc ? `    <div class="arch-layer-desc">${escapeHtml(layer.desc)}</div>` : '',
    '  </div>',
    '</div>',
  ].filter(Boolean).join('\n')).join('\n');

  // funnel (23)
  const funnelStages = Array.isArray(scene.funnel_stages) ? scene.funnel_stages : [];
  const fnCount = funnelStages.length || 1;
  tokens.FUNNEL_TIERS_HTML = funnelStages.map((t, i) => {
    const step = Math.min(42, i * (fnCount <= 4 ? 10 : 7));
    const w = Math.max(58, 100 - step);
    return [
      `<div class="fn-tier" style="--fn-w:${w}%"${vpBlockAnimAttrs(designParams, i)}>`,
      `  <div class="fn-label">${escapeHtml(t.label || '')}</div>`,
      t.desc ? `  <div class="fn-desc">${escapeHtml(t.desc)}</div>` : '',
      '</div>',
    ].filter(Boolean).join('\n');
  }).join('\n');

  // ── 5. Structured variant tokens ─────────────────────────────────────────

  // code_block variant: CODE_LABEL + CODE_SNIPPET
  tokens.CODE_LABEL   = escapeHtml(scene.code_language || scene.code_label || 'Code');
  tokens.CODE_SNIPPET = scene.code_snippet
    ? escapeHtml(scene.code_snippet)
    : escapeHtml(Array.isArray(scene.body) ? scene.body.join('\n') : (scene.body || ''));

  // table variant: TABLE_HEADERS + TABLE_ROWS + adaptive size tokens
  if (scene.table_headers && Array.isArray(scene.table_headers)) {
    tokens.TABLE_HEADERS = scene.table_headers
      .map(h => `<th>${escapeHtml(h)}</th>`).join('');
    tokens.TABLE_ROWS = (scene.table_rows || [])
      .map(row => '<tr>' + (Array.isArray(row) ? row : [row])
        .map(cell => `<td>${escapeHtml(String(cell))}</td>`).join('') + '</tr>')
      .join('\n      ');
    const rows = (scene.table_rows || []).length;
    // Adaptive font sizes: fewer rows → larger text
    tokens.TABLE_FONT_SIZE    = rows <= 3 ? '26' : rows <= 5 ? '22' : rows <= 7 ? '19' : rows <= 10 ? '17' : '15';
    tokens.TABLE_TH_FONT      = rows <= 3 ? '18' : rows <= 5 ? '16' : '14';
    tokens.TABLE_HEADER_HEIGHT = rows <= 3 ? '88' : rows <= 5 ? '76' : rows <= 7 ? '64' : '56';
  } else {
    tokens.TABLE_HEADERS = '';
    tokens.TABLE_ROWS = '';
    tokens.TABLE_FONT_SIZE = '22';
    tokens.TABLE_TH_FONT = '16';
    tokens.TABLE_HEADER_HEIGHT = '76';
  }

  // icon_grid variant: ICONS_HTML + adaptive size tokens
  if (scene.icons && Array.isArray(scene.icons)) {
    const hasDesc = scene.icons.some(ic => ic.desc || ic.body);
    tokens.ICONS_HTML = scene.icons.map((ic, ii) => {
      const descText = ic.desc || ic.body || '';
      return [
        `<div class="icon-card"${vpBlockAnimAttrs(designParams, ii)}>`,
        `  <span class="icon-emoji">${escapeHtml(ic.emoji || '📌')}</span>`,
        `  <div class="icon-label">${escapeHtml(ic.label || '')}</div>`,
        descText ? `  <div class="icon-desc">${escapeHtml(descText)}</div>` : '',
        '</div>',
      ].filter(Boolean).join('\n');
    }).join('\n');
    const ic = scene.icons.length;

    // ── Column count: prefer multi-row layouts, avoid ultra-wide single rows ──
    // 2→2col(1r), 3→3col(1r), 4→2col(2r), 5→3col(2r), 6→3col(2r),
    // 7→4col(2r), 8→4col(2r), 9→3col(3r), 10→5col(2r), 12→4col(3r)
    const colMap = { 1:1, 2:2, 3:3, 4:2, 5:3, 6:3, 7:4, 8:4, 9:3, 10:5, 11:4, 12:4 };
    const cols = colMap[ic] || (ic <= 3 ? ic : ic <= 6 ? 3 : ic <= 9 ? 3 : 4);
    tokens.ICON_GRID_COLS = String(cols);

    // ── Grid max-width so narrower grids don't span full 1680px ──────────────
    const maxWidthMap = { 2: 900, 3: 1400, 4: 1640, 5: 1680 };
    tokens.ICON_GRID_MAX_WIDTH = String(maxWidthMap[cols] || 1680);

    // ── Card min-height varies by row count ───────────────────────────────────
    const rows = Math.ceil(ic / cols);
    tokens.ICON_CARD_MIN_HEIGHT = rows === 1 ? '220' : rows === 2 ? '290' : '240';

    // emoji size: bigger when fewer cols/rows
    const emojiBase = hasDesc
      ? (cols <= 2 ? '80' : cols === 3 ? '62' : '52')
      : (cols <= 2 ? '96' : cols === 3 ? '78' : cols === 4 ? '66' : '56');
    tokens.ICON_EMOJI_SIZE = emojiBase;
    // label size — bumped to be readable at 1920×1080
    tokens.ICON_LABEL_SIZE = hasDesc
      ? (cols <= 2 ? '26' : cols === 3 ? '22' : '20')
      : (cols <= 2 ? '30' : cols === 3 ? '26' : cols === 4 ? '24' : '22');
    // expose for CSS density logic
    tokens.ICON_HAS_DESC = hasDesc ? '1' : '0';
  } else {
    tokens.ICONS_HTML = '';
    tokens.ICON_GRID_COLS = '6';
    tokens.ICON_GRID_MAX_WIDTH = '1680';
    tokens.ICON_CARD_MIN_HEIGHT = '240';
    tokens.ICON_EMOJI_SIZE = '72';
    tokens.ICON_LABEL_SIZE = '22';
  }

  // card_grid variant: CARDS_HTML (pre-rendered card divs)
  if (scene.cards && Array.isArray(scene.cards)) {
    // Auto-number when scene.cards_numbered=true and no card has explicit number
    const wantAutoNum = scene.cards_numbered && scene.cards.every(c => !c.number);
    tokens.CARDS_HTML = scene.cards.map((card, idx) => {
      const numStr = card.number || (wantAutoNum ? String(idx + 1).padStart(2, '0') : '');
      const hasNum = Boolean(numStr);
      return [
        `<div class="card${hasNum ? ' card-numbered' : ''}"${vpBlockAnimAttrs(designParams, idx)}>`,
        hasNum                 ? `  <div class="card-num">${escapeHtml(numStr)}</div>` : '',
        !hasNum && card.icon  ? `  <div class="card-icon">${escapeHtml(card.icon)}</div>` : '',
        card.label             ? `  <div class="card-label">${escapeHtml(card.label)}</div>` : '',
        `  <div class="card-title">${escapeHtml(card.title || '')}</div>`,
        `  <div class="card-body">${escapeHtml(card.body || '')}</div>`,
        card.tag               ? `  <div class="card-tag">${escapeHtml(card.tag)}</div>` : '',
        '</div>',
      ].filter(Boolean).join('\n');
    }).join('\n');
  } else {
    tokens.CARDS_HTML = '';
  }

  // nav_bar variant: 顶部导航栏 + 进度条
  {
    const navLogo = scene.nav_logo || 'Tech';
    // 驼峰或空格分割：前半作 logo_a，后半作 logo_b（带主题色）
    const logoMatch = navLogo.match(/^([A-Za-z\u4e00-\u9fff]+?)([A-Z][a-z].+|[\u4e00-\u9fff]{1,4})$/);
    tokens.NAV_LOGO_A = escapeHtml(logoMatch ? logoMatch[1] : navLogo);
    tokens.NAV_LOGO_B = escapeHtml(logoMatch ? logoMatch[2] : '');

    const navItems = Array.isArray(scene.nav_items) ? scene.nav_items : [];
    const activeIdx = typeof scene.nav_active === 'number' ? scene.nav_active : 0;
    tokens.NAV_ITEMS_HTML = navItems.map((item, i) =>
      `      <div class="nav-item${i === activeIdx ? ' active' : ''}"${vpBlockAnimAttrs(designParams, i)}>${escapeHtml(String(item))}</div>`
    ).join('\n');

    tokens.AUTHOR_DATE   = escapeHtml(scene.author_date   || '');
    tokens.PROGRESS_PCT  = String(scene.progress_pct != null
      ? scene.progress_pct
      : Math.round((pageNum / totalPages) * 100));
    tokens.SECTION_LABEL = escapeHtml(scene.section_label ||
      `Section ${String(pageNum).padStart(2,'0')} · ${String(totalPages).padStart(2,'0')}`);
    tokens.BOTTOM_TEXT   = escapeHtml(scene.bottom_text   || '');
    // 14_nav_bar 正文在 {{SUBTITLE}}（不是 {{BODY}}）；body 为 null 时常仅剩 Step1 的 script
    if (variant === 'nav_bar') {
      const subSrc = scene.subtitle || scene.secondary
        || (Array.isArray(scene.body) ? scene.body[0] : (scene.body != null ? String(scene.body) : ''));
      if ((!subSrc || !String(subSrc).trim()) && scene.script) {
        tokens.SUBTITLE = escapeHtml(String(scene.script).trim());
      }
    }
  }

  // chart variant: CSS 柱状图 + 图例 + 底部统计
  {
    const chartData   = Array.isArray(scene.chart_data)   ? scene.chart_data   : [];
    const chartSeries = Array.isArray(scene.chart_series)  ? scene.chart_series  : [];
    const chartStats  = Array.isArray(scene.chart_stats)   ? scene.chart_stats   : [];

    const BAR_CLASSES  = ['bar-blue', 'bar-purple'];
    const DOT_CLASSES  = ['legend-dot-blue', 'legend-dot-purple'];
    const MAX_H = 280; // 与模板 .bar-wrap { height: 280px } 对应

    // 全量最大值用于等比缩放
    const allVals = chartData.flatMap(d => Array.isArray(d.values) ? d.values : [Number(d.value) || 0]);
    const maxVal  = Math.max(...allVals, 1);

    tokens.CHART_BARS_HTML = chartData.map((group, gi) => {
      const vals = Array.isArray(group.values) ? group.values : [Number(group.value) || 0];
      const barHtml = vals.map((v, si) => {
        const h   = Math.round((v / maxVal) * MAX_H);
        const cls = BAR_CLASSES[si % BAR_CLASSES.length];
        const label = (Number.isInteger(v) ? v : v.toFixed(1)) + (group.unit || '');
        return `        <div class="bar ${cls}" style="height:${h}px"><span class="bar-val">${escapeHtml(String(label))}</span></div>`;
      }).join('\n');
      return [
        `    <div class="bar-group"${vpBlockAnimAttrs(designParams, gi)}>`,
        '      <div class="bar-wrap">',
        barHtml,
        '      </div>',
        `      <div class="bar-label">${escapeHtml(String(group.label || ''))}</div>`,
        '    </div>',
      ].join('\n');
    }).join('\n');

    tokens.CHART_LEGEND_HTML = chartSeries.map((name, i) =>
      `    <div class="legend-item"${vpBlockAnimAttrs(designParams, i)}><div class="legend-dot ${DOT_CLASSES[i % DOT_CLASSES.length]}"></div>${escapeHtml(String(name))}</div>`
    ).join('\n');

    tokens.CHART_STATS_HTML = chartStats.map((s, si) =>
      `    <div class="stat-item"${vpBlockAnimAttrs(designParams, si)}><div class="stat-val">${escapeHtml(String(s.value || ''))}</div><div class="stat-label">${escapeHtml(String(s.label || ''))}</div></div>`
    ).join('\n');

    // SUBTITLE 复用基础 tokens（buildTokens 已处理）
  }

  // ── 6. Named element tokens ───────────────────────────────────────────────
  tokens.PANEL_EYEBROW = escapeHtml(scene.panel_eyebrow || scene.eyebrow || scene.section_label || '');
  const panelTitleFallback = Array.isArray(scene.body) ? scene.body[0] : '';
  tokens.PANEL_TITLE   = escapeHtml(scene.panel_title || panelTitleFallback || scene.subtitle || '');

  // Adaptive font size for key_points: fewer items → larger font
  const kpCount = Array.isArray(scene.key_points) ? scene.key_points.length : 0;
  const kpFontSize = kpCount <= 2 ? 46
    : kpCount === 3 ? 38
    : kpCount === 4 ? 32
    : kpCount === 5 ? 27
    : kpCount === 6 ? 24
    : 21;
  const kpDotSize = kpFontSize >= 38 ? 11 : kpFontSize >= 32 ? 9 : 8;
  tokens.KP_FONT_SIZE = String(kpFontSize);
  tokens.KP_DOT_SIZE  = String(kpDotSize);
  tokens.BIG_NUMBER  = escapeHtml(scene.big_number  || '');
  tokens.NUMBER_UNIT = escapeHtml(scene.number_unit || '');
  tokens.QUOTE_BODY  = escapeHtml(scene.quote_body  || scene.body?.[0] || '');
  tokens.QUOTE_SOURCE= escapeHtml(scene.quote_source || '');

  // ── hybrid variant tokens ────────────────────────────────────────────────

  // panel_stat (16): bullet list on left + single big stat on right
  tokens.STAT_VALUE   = escapeHtml(scene.stat_value   || scene.big_number   || '');
  tokens.STAT_UNIT    = escapeHtml(scene.stat_unit     || scene.number_unit  || '');
  tokens.STAT_LABEL   = escapeHtml(scene.stat_label    || '');
  tokens.STAT_CAPTION = escapeHtml(scene.stat_caption  || '');
  tokens.STAT_EYEBROW = escapeHtml(scene.stat_eyebrow  || scene.eyebrow || '核心数据');

  // number_bullets (17): reuses STAT_VALUE / STAT_UNIT / STAT_LABEL + numbered bullets
  // Supports key_point_descs[] for optional body text under each bullet
  {
    const bullets = scene.key_points || [];
    const bulletDescs = scene.key_point_descs || [];
    tokens.BULLETS_HTML = bullets.map((kp, i) => {
      const desc = bulletDescs[i] || '';
      const textInner = desc
        ? `<div class="bullet-text-wrap"><div class="bullet-text">${escapeHtml(kp)}</div><div class="bullet-desc">${escapeHtml(desc)}</div></div>`
        : `<span class="bullet-text">${escapeHtml(kp)}</span>`;
      return `<div class="bullet-item"${vpBlockAnimAttrs(designParams, i)}><span class="bullet-num">${String(i + 1).padStart(2, '0')}</span>${textInner}</div>`;
    }).join('\n    ');
  }

  // quote_context (18): quote + attribution + context paragraph
  // QUOTE_BODY and QUOTE_SOURCE already set above
  tokens.QUOTE_ROLE    = escapeHtml(scene.quote_role   || scene.quote_attr || '');
  tokens.CONTEXT_BODY  = escapeHtml(
    scene.context_body
    || (Array.isArray(scene.body) ? scene.body.join(' ') : (scene.body || ''))
  );

  // text_icons (19): body text on left + icon grid on right (max 4 icons for 2×2)
  // ICONS_HTML already handled by icon_grid block above; here we limit to 4 for 2×2 layout
  if (variant === 'text_icons' && scene.icons && Array.isArray(scene.icons)) {
    const iconsForGrid = scene.icons.slice(0, 4);
    tokens.ICONS_HTML = iconsForGrid.map((ic, ti) => [
      `<div class="icon-card"${vpBlockAnimAttrs(designParams, ti)}>`,
      `  <span class="icon-emoji">${escapeHtml(ic.emoji || '📌')}</span>`,
      `  <div class="icon-label">${escapeHtml(ic.label || '')}</div>`,
      '</div>',
    ].join('\n')).join('\n');
  }
  if (scene.secondary) {
    const secArr = Array.isArray(scene.secondary) ? scene.secondary : [String(scene.secondary)];
    tokens.SECONDARY = secArr.map(p => escapeHtml(p)).join(' <br> ');
  } else {
    tokens.SECONDARY = '';
  }

  // ── 6. PANEL_CSS / PANEL_BODY (for fallback content.html) ────────────────
  // Only injected when the fallback template is used; specific variant templates
  // (02_panel.html etc.) handle their own styling directly.
  if (html.includes('{{PANEL_CSS}}') || html.includes('{{PANEL_BODY}}')) {
    const isPanel = variant === 'panel' || scene.use_panel;
    if (isPanel && (scene.key_points || []).length > 0) {
      tokens.PANEL_CSS = [
        `.panel { background: ${tpl.panelBg}; border: ${tpl.panelBorder};`,
        `  border-top: ${tpl.panelBorderTop}; border-bottom: ${tpl.panelBorderBottom};`,
        `  box-shadow: ${tpl.panelShadow}; border-radius: ${tpl.panelRadius};`,
        `  padding: 40px 48px; margin-top: 8px; }`,
        `.kp-list { list-style: none; display: flex; flex-direction: column; gap: 18px; margin-top: 20px; }`,
        `.kp-item { font-size: 22px; color: ${tpl.textColor}; display: flex; align-items: flex-start; gap: 12px; }`,
        `.kp-arrow { color: ${tpl.accent}; flex-shrink: 0; }`,
      ].join('\n  ');
      const kpItems = (scene.key_points || []).map((kp, pi) =>
        `<li class="kp-item"${vpBlockAnimAttrs(designParams, pi)}><span class="kp-arrow">›</span><span>${escapeHtml(kp)}</span></li>`
      ).join('\n    ');
      tokens.PANEL_BODY = `<div class="panel"><ul class="kp-list">\n    ${kpItems}\n  </ul></div>`;
    } else {
      // Plain body paragraphs
      tokens.PANEL_CSS = `.body-text { font-size: 26px; line-height: 1.65; color: ${tpl.textSecondary}; margin-bottom: 20px; max-width: 900px; }`;
      const panelBodyRaw = scene.body || [];
      const panelBodyArr = Array.isArray(panelBodyRaw) ? panelBodyRaw : String(panelBodyRaw).split(/\n\n+/).filter(Boolean);
      tokens.PANEL_BODY = panelBodyArr
        .map(p => `<p class="body-text">${escapeHtml(p)}</p>`)
        .join('\n  ');
    }
  }

  // ── 7. layout_hint + density → <body class="..."> 通用注入 ──────────────
  // 注入在 replaceTokens 之前，避免干扰 token 替换
  {
    const density = computeDensity(scene);
    const classes = [
      scene.layout_hint ? `layout-${scene.layout_hint}` : null,
      (!scene.layout_hint && variant === 'process_flow') ? 'layout-horizontal' : null,
      density !== 'normal'  ? `density-${density}`       : null,
    ].filter(Boolean);

    if (classes.length > 0) {
      const classStr = classes.join(' ');
      html = html.replace(/<body([^>]*)>/i, (_, attrs) => {
        const m = attrs.match(/class="([^"]*)"/);
        return m
          ? `<body${attrs.replace(/class="[^"]*"/, `class="${m[1]} ${classStr}"`)}>` 
          : `<body${attrs} class="${classStr}">`;
      });
    }

    // Readability + density + glass + title scale + variant-specific layout
    const readCSS = getReadabilityCSS();
    const densityCSS = getDensityCSS(density);
    const glassCSS = getGlassEnhancementCSS(tpl);
    const titleCSS = getTitleEnhancementCSS('content');
    // Universal vertical centering: all content variants center on the 1080p canvas.
    // Card-grid group: title stays top, .grid fills remaining space with align-content:center.
    // All other variants: entire title+content block is centered as a group (justify-content:center).
    const isCardVariant = ['card_grid', 'panel_stat', 'text_icons'].includes(variant);
    const cardCenterCSS = isCardVariant ? `
  /* ── Card grid: title top-aligned, cards centered in remaining space ── */
  body { display: flex !important; flex-direction: column !important; justify-content: flex-start !important; }
  .grid { flex: 1 !important; align-content: center !important; min-height: 0 !important; margin-left: auto !important; margin-right: auto !important; width: 100% !important; }
  .page-num, .hairline, .vp-footnote { position: absolute !important; }
` : `
  /* ── Universal: whole title+content group centered vertically ── */
  body { display: flex !important; flex-direction: column !important; justify-content: center !important; }
  .page-num, .hairline, .vp-footnote { position: absolute !important; }
`;
    const hoverStyle = getVariantInteractiveHoverStyleBlock(variant);
    html = html.replace('</head>', `<style>${readCSS}${densityCSS}${glassCSS}${titleCSS}${cardCenterCSS}\n  </style>\n${hoverStyle || ''}</head>`);
  }

  // ── 8. footnote — inject before </body> if scene.footnote is set ─────────
  // Done without touching any template file; works for all 168+ templates.
  const footnoteText = scene.footnote || scene.annotation || '';
  if (footnoteText) {
    html = html.replace('</body>',
      `  <div class="vp-footnote">${escapeHtml(footnoteText)}</div>\n</body>`);
  }

  // ── 9. Done ──────────────────────────────────────────────────────────────
  return mergeAnimationIntoHtml(replaceTokens(html, tokens), designParams);
}

function generateSummary(scene, tpl, designMode, pageNum, totalPages, designParams) {
  return generateContent({ ...scene, type: 'content', use_panel: true }, tpl, designMode, pageNum, totalPages, designParams);
}

function generateHtml(scenes, designMode, outputDir, designParamsOrDirections) {
  const tpl = DESIGN_TEMPLATES[designMode] || DESIGN_TEMPLATES['electric-studio'];
  fs.mkdirSync(outputDir, { recursive: true });

  const designParams = Array.isArray(designParamsOrDirections) || designParamsOrDirections == null
    ? null
    : designParamsOrDirections;
  const pageDirs = Array.isArray(designParamsOrDirections)
    ? designParamsOrDirections
    : (designParamsOrDirections?.page_directions || tpl.page_directions || []);
  const results = [];
  for (let i = 0; i < scenes.length; i++) {
    const rawScene = scenes[i];
    const dir = pageDirs.find(d => d.id === rawScene.id) || {};
    // Infer content_variant from scene data if not explicitly set
    function inferVariant(s) {
      if (s.content_variant) return s.content_variant;
      if (dir.content_variant) return dir.content_variant;
      if (Array.isArray(s.compare_left_points) && s.compare_left_points.length &&
          Array.isArray(s.compare_right_points) && s.compare_right_points.length) return 'compare';
      if (Array.isArray(s.process_stages) && s.process_stages.length >= 2) return 'process_flow';
      if (Array.isArray(s.flow_lanes) && s.flow_lanes.length >= 1) return 'process_flow';
      if (Array.isArray(s.layers) && s.layers.length >= 2) return 'architecture_stack';
      if (Array.isArray(s.funnel_stages) && s.funnel_stages.length >= 2) return 'funnel';
      if (Array.isArray(s.chart_data)  && s.chart_data.length)  return 'chart';
      if (Array.isArray(s.nav_items)   && s.nav_items.length)   return 'nav_bar';
      if (Array.isArray(s.stats)       && s.stats.length)       return 'stats_grid';
      if (Array.isArray(s.steps)       && s.steps.length)       return 'timeline';
      if (s.left_body != null)                                   return 'two_col';
      if (Array.isArray(s.cards)       && s.cards.length)       return 'card_grid';
      // hybrid variants: detect by unique field combinations first
      if (s.stat_value != null && Array.isArray(s.key_points) && s.key_points.length && s.icons == null) return 'panel_stat';
      if (s.stat_value != null && Array.isArray(s.key_points) && s.key_points.length && s.big_number == null) return 'number_bullets';
      if (s.quote_body != null && s.context_body != null)        return 'quote_context';
      if (s.body      != null && Array.isArray(s.icons) && s.icons.length && s.icons.length <= 4) return 'text_icons';
      // standard variants
      if (Array.isArray(s.chart_data)  && s.chart_data.length)  return 'chart';
      if (Array.isArray(s.nav_items)   && s.nav_items.length)   return 'nav_bar';
      if (Array.isArray(s.stats)       && s.stats.length)       return 'stats_grid';
      if (Array.isArray(s.icons)       && s.icons.length)       return 'icon_grid';
      if (s.table_headers != null)                               return 'table';
      if (s.code_snippet  != null)                               return 'code';
      if (s.quote_body    != null)                               return 'quote';
      if (s.big_number    != null)                               return 'number';
      if (Array.isArray(s.key_points)  && s.key_points.length)  return 'panel';
      return 'text';
    }
    // layout_hint: scene (LLM) wins over dir (step2), dir wins over undefined
    const layoutHint = rawScene.layout_hint || dir.layout_hint || null;
    const scene = { ...rawScene, content_variant: inferVariant(rawScene), layout_hint: layoutHint };
    const pageNum = i + 1;
    const totalPages = scenes.length;

    let html;
    if (scene.type === 'cover') {
      html = generateCover(scene, tpl, designMode, pageNum, totalPages, designParams);
    } else if (scene.type === 'summary') {
      html = generateSummary(scene, tpl, designMode, pageNum, totalPages, designParams);
    } else {
      html = generateContent(scene, tpl, designMode, pageNum, totalPages, designParams);
    }

    if (!html) {
      console.error(`   ⚠️  无法为 scene[${i}] 生成 HTML（缺少模板），跳过`);
      continue;
    }

    const filename = `page_${String(pageNum).padStart(3, '0')}.html`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, html, 'utf8');
    results.push(filepath);
  }
  return results;
}

module.exports = { generateHtml, DESIGN_TEMPLATES };
