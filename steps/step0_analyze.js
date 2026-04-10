#!/usr/bin/env node
/**
 * Step 0: Content Analysis
 *
 * Phase A — Extract raw content (Feishu / local file / web URL)
 * Phase B — Single MiniMax LLM call → structured scenes[]
 *
 * Input:
 *   { "source": "<feishu_url|local_path|web_url>", "output_dir": "./project",
 *     "design_mode": "electric-studio", "language": "zh" }
 *
 * Output:
 *   scenes.json + project.json written to output_dir
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');
const { ensureDir, writeResult } = require('./utils/step-utils');
const { extract }                = require('./utils/content_extractor');

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

// ─── MiniMax client ────────────────────────────────────────────────────────────

async function callMiniMax(messages, { maxTokens = 8000 } = {}) {
  const apiKey  = process.env.MINIMAX_API_KEY;
  const baseUrl = process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1';
  const model   = process.env.MINIMAX_MODEL    || 'MiniMax-M2.7-highspeed';

  if (!apiKey) throw new Error('MINIMAX_API_KEY env var is required');

  const body = JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 });

  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/chat/completions`);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(`MiniMax error: ${json.error.message || JSON.stringify(json.error)}`));
          const text = json.choices?.[0]?.message?.content;
          if (!text) return reject(new Error(`Unexpected MiniMax response: ${data.slice(0, 300)}`));
          resolve(text);
        } catch (e) {
          reject(new Error(`MiniMax JSON parse failed: ${data.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Language detection ────────────────────────────────────────────────────────

function detectLanguage(text) {
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const english = (text.match(/[a-zA-Z]/g) || []).length;
  const ratio = english > 0 ? chinese / english : 0;
  return ratio > 0.4 ? 'zh' : 'en';
}

// ─── Phase B prompt ────────────────────────────────────────────────────────────

function buildStructurePrompt(extracted, language) {
  const lang = language === 'zh' ? '中文' : 'English';
  return `You are a professional presentation designer and content strategist. Your job is to analyze raw source content and structure it into a high-quality video presentation with ${lang} narration.

## Source Information
- Title: ${extracted.title || '(untitled)'}
- Source type: ${extracted.source_type}
- Language target: ${lang}

## Raw Content
\`\`\`
${extracted.raw_text.slice(0, 12000)}${extracted.raw_text.length > 12000 ? '\n... [content truncated]' : ''}
\`\`\`

## CRITICAL LANGUAGE RULE
- If the source content is predominantly Chinese (contains more Chinese than English characters), ALL scene fields (titles, eyebrows, subtitles, body text, labels, descriptions) MUST be in Chinese.
- If the source content is predominantly English, ALL fields MUST be in English.
- NEVER mix languages within a single scene or slide.
- Keep this rule consistently across every scene in the array.

## Your Task

Analyze the content and produce a structured JSON array of scenes for a video presentation. Each scene represents one slide.

**Scene types:**
- \`cover\` — Opening slide (exactly 1, always first)
- \`content\` — Main content slides
- \`summary\` — Closing slide (exactly 1, always last)

**Content variants** — choose the best fit per scene:
- \`panel\` — 3-6 key bullet points
- \`stats_grid\` — 2-4 statistics with labels and descriptions
- \`timeline\` — 3-5 sequential steps or phases
- \`two_col\` — prose explanation left + key points right
- \`number\` — single hero number/metric
- \`quote\` — impactful quote or statement
- \`text\` — flowing prose paragraph(s)
- \`code\` — code snippet with explanation
- \`table\` — comparative or structured data
- \`chart\` — CSS bar chart with 1-2 data series (use for trending data, comparative metrics, growth curves)
- \`nav_bar\` — agenda/chapter page with top nav bar and progress indicator (use once per major section transition)
- \`panel_stat\` — **HYBRID**: bullet list on the left + one big stat callout on the right (use when you have BOTH key points AND one dominant metric on the same slide)
- \`number_bullets\` — **HYBRID**: hero number at the top + numbered explanations below (use when a stat needs its breakdown reasons on the same slide)
- \`quote_context\` — **HYBRID**: impactful quote + attribution + context paragraph (richer than plain quote, use when the quote needs background)
- \`text_icons\` — **HYBRID**: prose text on the left + 2-4 icon anchors on the right (use when explaining a concept that benefits from visual labels)
- \`icon_grid\` — visual grid of 4-9 icon cards, each with emoji + label + one-line desc (use for feature matrices, capability overviews, category taxonomies; ALWAYS include desc for every icon)

**Content Density Principles — READ CAREFULLY:**

Each slide has a 1920×1080 canvas. Empty space looks unprofessional. Your primary goal is to **fill each slide with substantive content** by using each variant's full capacity:

| Variant | Capacity | Always fill |
|---------|----------|-------------|
| panel + grid-3 | 3 boxes × (title + 2-3 sentence desc) | key_point_descs — REQUIRED when using grid-3 or cards |
| panel + cards | 3-5 items × (title + 1-2 sentence desc) | key_point_descs — REQUIRED |
| card_grid | 3-6 cards × (title + body ~40 chars) | card.body — REQUIRED for every card |
| icon_grid | 4-9 icons × (emoji + label + desc) | icon.desc — REQUIRED for every icon |
| number_bullets | 1 big stat + 2-4 bullets × (title + desc) | key_point_descs — REQUIRED |
| stats_grid | 2-4 stats × (number + label + desc) | stat.desc — REQUIRED for every stat |
| timeline | 3-5 steps × (label + desc ~20 chars) | step.desc — REQUIRED for every step |
| two_col | left prose (2-3 sentences) + right bullets | left_body — write 2+ sentences |
| quote_context | quote + attribution + context paragraph | context_body — always include |

**MANDATORY RULE: When you choose a variant, fill EVERY optional body/desc field if the source content has relevant information. A card_grid where every card only has a title — but no body — is a wasted slide.**

**Rules:**
1. Total slides: scale with source length — short article (≤800 chars) → 5-7 slides; medium (800-3000 chars) → 7-10 slides; long (>3000 chars) → 10-14 slides. Never truncate important content just to stay within range.
2. **Prefer fewer, richer slides over many sparse ones.** If two adjacent topics each only have 2 bullet points, merge them into one \`two_col\` or \`card_grid\` slide.
3. No two consecutive slides with the same content_variant (enforce visual rhythm)
4. Use \`stats_grid\` or \`number\` when content has concrete metrics; use \`panel_stat\` when a metric AND key points belong together
5. Use \`timeline\` for processes, steps, histories, roadmaps
6. Use \`two_col\` for topics needing both context and key takeaways
7. Use hybrid variants (\`panel_stat\`, \`number_bullets\`, \`quote_context\`, \`text_icons\`) when content genuinely needs two elements — max 2 hybrid slides per deck
8. Titles: crisp and punchy (≤15 chars zh, ≤8 words en)
9. Eyebrow: short category label (e.g. "核心数据", "关键洞察", "BACKGROUND")
10. **layout_hint defaults that maximize visual impact:** panel with 3 rich items → \`grid-3\`; panel with 4-6 items → \`cards\`; card_grid with exactly 4 cards → \`2x2\`; timeline with ≤4 steps → \`horizontal\`

**JSON schema per variant:**

**layout_hint** — optional field on any scene, controls sub-layout within the same template:
- panel:      "stack"(default) | "grid-3" | "sidebar-left" | "cards" | "numbered"
- stats_grid: "row"(default)   | "hero-1" | "2x2"
- timeline:   "vertical"(def)  | "horizontal" | "alternating"
- two_col:    "equal"(default) | "wide-left" | "wide-right"
- quote:      "center"(def)    | "left-bar" | "full"
- number:     "center"(def)    | "split"

Guidance: grid-3 for ≤3 short panel points; hero-1 for one dominant metric; horizontal for ≤4 timeline steps; left-bar when quote has a source; split when number has body text; full for a short punchy quote.

panel / summary with key points:
  key_points: string[]        (3-6 items, each ≤30 chars — the title/headline of each box)
  key_point_descs: string[]   (REQUIRED when layout_hint is "grid-3" or "cards" — same length, 1-2 sentence body text per box; omit only for plain stack layout)
  layout_hint: string         (use "grid-3" for 3 items, "cards" for 4-6 items, to enable the richer layout)

stats_grid:
  stats: [{ number: "80%", label: "用户满意度", desc: "来自2024年调研，覆盖全量用户" }]
  (desc REQUIRED for every stat — at least one sentence of context or source)

timeline:
  steps: [{ num: "01", label: "阶段名", desc: "该阶段的核心特征或成果，≤30 chars" }]
  (desc REQUIRED for every step)

two_col:
  left_body: string   (prose, 2-3 sentences minimum — give context, background, or explanation)
  right_label: string
  key_points: string[]

number:
  big_number: string   (e.g. "80年", "3x")
  body: string         (explanation, ≤60 chars)

quote:
  quote_body: string
  quote_source: string

text:
  body: string   (prose paragraphs, use \\n\\n between paragraphs)

code:
  code_label: string
  code_snippet: string

table:
  table_headers: string[]   (e.g. ["类别", "模块名称"])
  table_rows: string[][]   (e.g. [["工程化", "启动优化、Feature Flag"], ["AI交互", "对话循环、缓存"]])

chart:
  chart_series: string[]              (1-2 series names, e.g. ["2023", "2024"])
  chart_data: [{ label: string, values: number[], unit?: string }]   (4-8 data groups)
  chart_stats: [{ value: string, label: string }]   (2-3 summary stats shown below chart, optional)

nav_bar:
  nav_logo: string          (brand name, e.g. "TechKeynote" or "Product2026")
  nav_items: string[]       (3-6 chapter names shown in top nav)
  nav_active: number        (0-based index of the currently active nav item)
  author_date: string       (top-right label, e.g. "张三 · 2026")
  section_label: string     (section indicator, e.g. "Chapter 01 · 05")
  bottom_text: string       (bottom-left annotation, e.g. "CONFIDENTIAL")
  progress_pct: number      (0-100, estimated reading progress for the progress bar)

panel_stat:
  key_points: string[]      (2-4 items for the bullet panel)
  stat_value: string        (the big number/metric, e.g. "1200万")
  stat_unit: string         (unit suffix, e.g. "用户" or "%", optional)
  stat_label: string        (label below the number, e.g. "月活跃用户")
  stat_caption: string      (brief context, ≤40 chars, optional)
  stat_eyebrow: string      (small label above the number, e.g. "核心指标")

number_bullets:
  stat_value: string        (the hero number, e.g. "240%")
  stat_unit: string         (unit, optional)
  stat_label: string        (what the number measures)
  key_points: string[]      (2-4 short reason titles explaining the number)
  key_point_descs: string[] (REQUIRED — same length, 1 sentence elaboration per bullet with concrete evidence or detail)

quote_context:
  quote_body: string        (the main quote text)
  quote_source: string      (speaker name / company)
  quote_role: string        (title or context, e.g. "CEO, Acme Inc.")
  context_body: string      (1-2 sentences of background or significance)

text_icons:
  body: string              (main prose explanation, 2-3 sentences)
  icons: [{ emoji: string, label: string }]   (2-4 icons for the right-side grid)

icon_grid:
  icons: [{ emoji: string, label: string, desc: string }]   (4-9 icon cards — ALWAYS include desc for EVERY icon, 1 sentence ≤28 chars; a grid without descs wastes the card space)
  Use icon_grid when showcasing a feature matrix, capability overview, or categorical taxonomy with visual anchors.

card_grid:
  cards: [{ number?: string, icon?: string, label?: string, title: string, body: string, tag?: string }]  (3-6 cards)
  (body REQUIRED for every card — 1-2 sentences of substance; a card with only a title is a wasted card)
  cards_numbered: boolean  (optional — set true to auto-assign "01"/"02"/... to all cards when no explicit number is set)
  layout_hint: "default"(3-col) | "2x2" (for exactly 4 cards in a 2×2 grid — use 2x2 when you have exactly 4 cards)
  footnote: string  (optional — one italic annotation line at the bottom of the slide, e.g. "数据来源：2025年度报告")

  **card.number** vs **card.icon**: mutually exclusive — use number field ("01", "02", ...) for sequential/ordered content (steps, problem lists, feature lists with rank); use icon field (emoji) for categorical/parallel content (feature icons, capability maps). When all cards share a numbered sequence, prefer cards_numbered: true for auto-assignment.

**footnote** is available on ANY scene variant. Use it sparingly for source attribution or important caveats.
**card.label**: short category label above the card title (e.g. "团队", "产品", "挑战"), 3-6 characters, optional.

All scenes also have: id, type, content_variant (for content scenes), eyebrow, title, secondary (optional subtitle), script_hint (one sentence on how to narrate this slide).

## Design theme recommendation (required)

Also pick the single best **visual theme id** for this deck (semantic match to tone and audience). Use exactly one of these ids:
electric-studio, bold-signal, creative-voltage, dark-botanical, neon-cyber, terminal-green, deep-tech-keynote, notebook-tabs, paper-ink, pastel-geometry, split-pastel, swiss-modern, vintage-editorial

Return **one** JSON value — either:
- A **JSON object**: \`{ "recommended_design_mode": "<id>", "scenes": [ ... ] }\`  (preferred), or
- A **JSON array** of scenes only (legacy; if you omit the object wrapper, theme choice falls back to Step2 rules).

No markdown fences, no explanation text outside the JSON.`;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  try {
    const params = JSON.parse(input);
    const {
      source,
      output_dir = './project',
      design_mode = 'electric-studio',
      language = 'zh'
    } = params;

    if (!source) throw new Error('"source" is required (Feishu URL, local file path, or web URL)');

    const outputPath = path.resolve(output_dir);
    ensureDir(outputPath);

    // ── Phase A: Extract ──────────────────────────────────────────────────────
    process.stderr.write('🔍 Phase A: Extracting content…\n');
    const extracted = await extract(source);
    process.stderr.write(`✅ Extracted ${extracted.raw_text.length} chars from ${extracted.source_type}\n`);

    fs.writeFileSync(
      path.join(outputPath, 'raw_content.txt'),
      `# ${extracted.title}\n\n${extracted.raw_text}`
    );

    // ── Phase B: LLM structuring ──────────────────────────────────────────────
    process.stderr.write(`🤖 Phase B: Structuring with MiniMax (${process.env.MINIMAX_MODEL || 'MiniMax-M2.7-highspeed'})…\n`);
    const prompt = buildStructurePrompt(extracted, language);
    const raw = await callMiniMax([{ role: 'user', content: prompt }], { maxTokens: 8000 });

    const THEME_IDS = new Set([
      'electric-studio', 'bold-signal', 'creative-voltage', 'dark-botanical', 'neon-cyber', 'terminal-green',
      'deep-tech-keynote', 'notebook-tabs', 'paper-ink', 'pastel-geometry', 'split-pastel', 'swiss-modern', 'vintage-editorial',
    ]);

    let scenes;
    let recommended_design_mode = null;
    try {
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.scenes)) {
        scenes = parsed.scenes;
        const rec = parsed.recommended_design_mode;
        if (rec && THEME_IDS.has(String(rec).trim())) recommended_design_mode = String(rec).trim();
      } else if (Array.isArray(parsed)) {
        scenes = parsed;
      } else {
        throw new Error('Expected scenes array or { recommended_design_mode, scenes }');
      }
    } catch (e) {
      const arrMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!arrMatch) throw new Error(`MiniMax did not return valid JSON:\n${raw.slice(0, 500)}`);
      scenes = JSON.parse(arrMatch[0]);
    }

    if (!Array.isArray(scenes) || scenes.length === 0) {
      throw new Error('MiniMax returned empty or invalid scenes array');
    }

    scenes.forEach((s, i) => { s.id = i + 1; });
    process.stderr.write(`✅ Structured ${scenes.length} scenes\n`);

    const scenesFile  = path.join(outputPath, 'scenes.json');
    const projectFile = path.join(outputPath, 'project.json');

    fs.writeFileSync(scenesFile, JSON.stringify(scenes, null, 2));
    const projectPayload = {
      source,
      source_type: extracted.source_type,
      title: extracted.title,
      design_mode,
      language,
      scenes,
      generated_at: new Date().toISOString()
    };
    if (recommended_design_mode) projectPayload.recommended_design_mode = recommended_design_mode;

    fs.writeFileSync(projectFile, JSON.stringify(projectPayload, null, 2));

    writeResult({
      success: true,
      step: 'step0',
      scenes_count: scenes.length,
      outputs: [scenesFile, projectFile],
      message: `Structured ${scenes.length} scenes from ${extracted.source_type} source`
    });

  } catch (err) {
    process.stderr.write(`❌ Step 0 failed: ${err.message}\n`);
    if (process.env.DEBUG) process.stderr.write(err.stack + '\n');
    process.exit(1);
  }
});
