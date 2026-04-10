# SlideForge

[中文](README.md)

> Turn any document into a polished 1920×1080 presentation — video, PDF, or interactive HTML — in under 10 minutes.

[Node.js](https://nodejs.org/)
[License: MIT](LICENSE)
[Version](_meta.json)

Feed in a Feishu doc, Markdown file, or any URL. The pipeline analyses your content with MiniMax LLM, picks one of **13 design themes**, renders pixel-perfect HTML slides, and packages the result in your chosen format — all fully automatic.

**[View demo output →](examples/demo-output/)** Open `presentation.html` in your browser to see a live example.

---

## Features

- **3 input sources** — Feishu docs, local `.md`/`.txt` files, web pages
- **3 output formats** — MP4 video (with TTS narration), PDF, interactive HTML slideshow
- **13 design themes** — 7 dark + 6 light, auto-selected by content keywords
- **20+ content variants** — panels, stats grids, timelines, card grids, icon matrices, charts, tables, quotes, code blocks, and hybrid layouts
- **Layout hints** — same variant, different visual arrangements (`grid-3`, `cards`, `hero-1`, `horizontal`, …)
- **Adaptive typography** — font sizes, grid columns, and density classes adjust to content length automatically
- **8 independent steps** — run the full pipeline or any step in isolation; all intermediate artifacts are persisted to disk
- **Outline + script** — every export includes `outline.md` and `script.md`

---

## Quick Start

```bash
# 1. Install
git clone https://github.com/mochueloxie-sudo/SlideForge.git
cd slide-forge
npm install

# 2. Configure
cp .env.example .env
# Edit .env → add MINIMAX_API_KEY (required)

# 3. Run (one command)
echo '{"command":"all","source":"./examples/test_article.md","format":"html","output_dir":"./output"}' | node executor.js

# 4. Open the result
open ./output/presentation.html
```

### Other Formats

```bash
# PDF
echo '{"command":"all","source":"./article.md","format":"pdf","output_dir":"./out"}' | node executor.js

# Video (requires ffmpeg + edge-tts)
echo '{"command":"all","source":"./article.md","format":"video","output_dir":"./out"}' | node executor.js

# Multiple formats at once
echo '{"command":"all","source":"./article.md","format":["pdf","html"],"output_dir":"./out"}' | node executor.js
```

---

## Pipeline

```
Source (Feishu / .md / URL)
  │
  ▼
Step 0 ── Content Analysis ──────── MiniMax LLM → scenes.json
  │
  ▼
Step 1 ── Script Generation ─────── MiniMax LLM → scenes[].script
  │
  ▼
Step 2 ── Design Parameters ─────── Local presets → design_params.json
  │                                  (explicit design_mode, Step0 recommendation, saved theme, or content-keyword rules + variant/layout hints)
  ▼
Step 3 ── HTML Rendering ───────── Template tokens → page_XXX.html
  │
  ▼
Step 4 ── Screenshot ───────────── Puppeteer → page_XXX.png (1920×1080)
  │
  ▼
Step 5 ── TTS ──────────────────── edge-tts → page_XXX.mp3 (skipped if no video)
  │
  ▼
Step 6 ── Delivery Format ──────── video / pdf / html + outline.md + script.md
  │
  ▼
Step 7 ── Delivery Channel ─────── local (default) / feishu
```

Every step reads and writes JSON to disk. You can re-run any step in isolation, inspect intermediates, or hand-edit `scenes.json` before continuing.

---

## Requirements


| Dependency          | Purpose                               | Install                                   |
| ------------------- | ------------------------------------- | ----------------------------------------- |
| **Node.js ≥ 18**    | Runtime                               | [nodejs.org](https://nodejs.org/)         |
| **Google Chrome**   | Screenshots + PDF (Step 4/6)          | Usually pre-installed                     |
| **MiniMax API Key** | Content analysis + scripts (Step 0/1) | [minimax.chat](https://api.minimax.chat/) |
| `edge-tts`          | TTS narration (Step 5, video only)    | `pip install edge-tts`                    |
| `ffmpeg`            | Video encoding (Step 6, video only)   | `brew install ffmpeg`                     |
| `lark-cli`          | Feishu publishing (Step 7, optional)  | `npm i -g @larksuite/cli`                 |


### Environment Variables

Copy `.env.example` to `.env` and fill in:

```ini
# Required
MINIMAX_API_KEY=sk-...
MINIMAX_MODEL=MiniMax-M2.7-highspeed
MINIMAX_BASE_URL=https://api.minimax.chat/v1

# Optional — Feishu integration
FEISHU_APP_ID=cli_...
FEISHU_APP_SECRET=...
```

---

## Themes

Leave `design_mode` empty for automatic resolution, or pass a theme id in the JSON for every run.

**Resolution order** (when `design_mode` is **not** in the request JSON):

1. `recommended_design_mode` from Step 0 (written to `project.json` when the LLM returns the object wrapper with a valid theme id).
2. `design_mode` in `project.json` if present and not the default `electric-studio`.
3. Content-keyword rules (`inferContentType` + `CONTENT_TYPE_MAP`), e.g. humanities / curation → `dark-botanical`.

An explicit `design_mode` in the **current** `executor.js` JSON always wins.

### Dark


| Theme               | Accent                 | Best for                   |
| ------------------- | ---------------------- | -------------------------- |
| `electric-studio`   | Blue-purple + sky blue | General (default fallback) |
| `bold-signal`       | Orange-red             | Business, branding         |
| `creative-voltage`  | Electric blue          | Creative, design           |
| `dark-botanical`    | Warm gold              | Humanities, education      |
| `neon-cyber`        | Neon cyan + purple     | Sci-fi, AI, gaming         |
| `terminal-green`    | GitHub green + blue    | Tech docs, APIs            |
| `deep-tech-keynote` | Sky blue + blue-purple | Keynote talks              |


### Light


| Theme               | Accent            | Best for              |
| ------------------- | ----------------- | --------------------- |
| `swiss-modern`      | Pure black        | Minimalist            |
| `paper-ink`         | Red + black       | Editorial, publishing |
| `vintage-editorial` | Brown-gold        | Retro, literary       |
| `notebook-tabs`     | Mint green        | Notes, journaling     |
| `pastel-geometry`   | Pastel + geometry | Playful, casual       |
| `split-pastel`      | Soft pink + blue  | Gentle, feminine      |


---

## Content Variants

The LLM automatically selects the best variant for each slide:


| Variant          | Template            | Trigger                  |
| ---------------- | ------------------- | ------------------------ |
| `text`           | `01_text_only`      | Body paragraphs          |
| `panel`          | `02_panel`          | `key_points[]` list      |
| `stats_grid`     | `03_stats_grid`     | `stats[]` metrics        |
| `number`         | `04_number`         | `big_number` hero stat   |
| `quote`          | `05_quote`          | `quote_body` citation    |
| `timeline`       | `07_timeline`       | `steps[]` flow           |
| `two_col`        | `08_two_col`        | Left + right columns     |
| `icon_grid`      | `10_icon_grid`      | `icons[]` emoji grid     |
| `code`           | `11_code_block`     | `code_snippet`           |
| `table`          | `12_table`          | `table_headers[]` data   |
| `card_grid`      | `13_card_grid`      | `cards[]`                |
| `nav_bar`        | `14_nav_bar`        | Section navigation       |
| `chart`          | `15_chart_demo`     | `chart_series` bar chart |
| `panel_stat`     | `16_panel_stat`     | Hybrid: list + stat      |
| `number_bullets` | `17_number_bullets` | Hybrid: number + bullets |
| `quote_context`  | `18_quote_context`  | Hybrid: quote + context  |
| `text_icons`     | `19_text_icons`     | Hybrid: text + icons     |


Each variant supports **layout hints** (e.g. `grid-3`, `cards`, `hero-1`, `horizontal`, `2x2`) to vary the visual arrangement without changing the template.

---

## Output Structure

```
output/
├── scenes.json            # Structured scene data + scripts
├── design_params.json     # Theme, variants, layout hints
├── page_001.html          # Rendered HTML slides
├── page_002.html
├── ...
├── screenshots/
│   ├── page_001.png       # 1920×1080 screenshots
│   └── ...
├── presentation.html      # Interactive slideshow (format=html)
├── presentation.pdf       # PDF document (format=pdf)
├── presentation.mp4       # Video with narration (format=video)
├── outline.md             # Content outline
├── script.md              # Full narration script
└── MANIFEST.md            # Delivery manifest (channel=local)
```

---

## Step-by-Step Usage

Run individual steps when you need fine-grained control:

```bash
P=./project

# Analyse content
echo '{"command":"step0","source":"./article.md","output_dir":"'"$P"'"}' | node executor.js

# Generate narration scripts
echo '{"command":"step1","scenes":"'"$P"'/scenes.json","output_dir":"'"$P"'"}' | node executor.js

# Design parameters (auto theme, or specify)
echo '{"command":"step2","scenes":"'"$P"'/scenes.json","output_dir":"'"$P"'","design_mode":"neon-cyber"}' | node executor.js

# Render HTML slides
echo '{"command":"step3","scenes":"'"$P"'/scenes.json","design_params":"'"$P"'/design_params.json","output_dir":"'"$P"'"}' | node executor.js

# Take screenshots
echo '{"command":"step4","html_dir":"'"$P"'","output_dir":"'"$P"'/screenshots"}' | node executor.js

# Generate delivery formats
echo '{"command":"step6","format":["pdf","html"],"scenes":"'"$P"'/scenes.json","screenshots_dir":"'"$P"'/screenshots","output_dir":"'"$P"'"}' | node executor.js

# Package for delivery
echo '{"command":"step7","channel":"local","output_dir":"'"$P"'"}' | node executor.js
```

---

## Agent Integration

SlideForge exposes a standard JSON-in / JSON-out interface via `stdin` → `executor.js` → `stdout`, making it compatible with any AI agent framework:

- **Claude Code** — use as a skill via `SKILL.md`
- **OpenClaw** — use `_meta.json` for auto-discovery
- **Custom agents** — pipe JSON commands to `node executor.js`

See `[_meta.json](_meta.json)` for the full input/output schema and `[SKILL.md](SKILL.md)` for the agent skill specification.

---

## Project Structure

```
slide-forge/
├── executor.js                     # Entry point — routes commands to steps
├── _meta.json                      # Agent integration schema (v3.0.1)
├── SKILL.md                        # Agent skill specification
├── steps/
│   ├── step0_analyze.js            # Content analysis (MiniMax LLM)
│   ├── step1_script.js             # Script generation (MiniMax LLM)
│   ├── step2_design.js             # Theme selection + variant inference
│   ├── step3_html.js               # HTML rendering (template engine)
│   ├── step4_screenshot.js         # Puppeteer screenshots
│   ├── step5_tts.js                # TTS (edge-tts → say fallback)
│   ├── step6_format.js             # Delivery formats (video/pdf/html)
│   ├── step6_video.js              # FFmpeg video encoding (internal)
│   ├── step7_channel.js            # Delivery channels (local/feishu)
│   ├── step7_publish.js            # Feishu publishing (internal)
│   └── utils/
│       ├── content_extractor.js    # Multi-source content extraction
│       ├── llm_client.js           # MiniMax HTTP client
│       ├── tool-locator.js         # System tool auto-discovery
│       └── step-utils.js           # Shared utilities
├── utils/
│   ├── html_generator.js           # Core: template loading + token replacement
│   └── screenshot.js               # Puppeteer wrapper
├── samples/                        # Design theme templates
│   ├── electric-studio/            # 13 theme directories, each with full variant set
│   ├── bold-signal/
│   ├── ...
│   └── shared/                     # Theme-agnostic variants (stats, timeline, etc.)
├── examples/
│   ├── test_article.md             # Sample article for testing
│   ├── tencent_intro_light.md      # Long-form corp. intro sample (e.g. swiss-modern)
│   ├── full_variant_test.md        # Full variant coverage test
│   └── scenes_example.json         # Manual scenes.json reference
├── .env.example                    # Environment variable template
└── package.json
```

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Follow the design principles:
  - **Templates over code** — all visual decisions live in `samples/*.html`, not in generator logic
  - **Fixed pixels** — templates use `px` units (1920×1080 target), never `rem`/`vw`
  - **Generator is a pipe** — load template → replace tokens → write file
  - **Token naming** — `{{UPPER_CASE}}`, repeat markers have no index
4. Test with `npm run test:e2e`
5. Open a PR

---

## License

[MIT](LICENSE)