# SlideForge

[中文](README.md)
[Changelog](CHANGELOG.md)
[SKILL.md (execution notes)](SKILL.md)
[Developer guide: CLAUDE.md](CLAUDE.md)

> Turn any document into a polished 1920×1080 presentation — video, PDF, or interactive HTML — in under 10 minutes.

[Node.js](https://nodejs.org/)
[License: MIT](LICENSE)
[Version](_meta.json)

**What it does**: Feishu / Markdown / URL → **1920×1080** decks (video, PDF, interactive HTML). Entrypoint is `node executor.js` with one JSON object on stdin. **Cursor, Codex, OpenClaw**, and similar clients can register this repo per their own skill/tool rules—**behavior and fields are documented in [SKILL.md](SKILL.md)** (host metadata in `_meta.json`).

For greenfield runs, Step0/1 call an **LLM configured via environment variables** (see **`.env.example`**), pick one of **13 design themes**, render HTML, then package per `format`.

**[View demo output →](examples/demo-output/)** Open `presentation.html` (iframe shell + co-located `page_*.html` for hover + entrance motion; **do not ship a single HTML alone**). For a **single-file** PNG flipbook aligned with PDF, use `presentation_static.html`.

## Documentation split

| Audience | File |
| --- | --- |
| **Usage & execution** | [SKILL.md](SKILL.md) — `command`, inputs, pipeline, deliverables, pre-run checks, **dependency list**, `presentation.html` / `presentation_static.html`, Feishu, step examples |
| **Development & debugging** | [CLAUDE.md](CLAUDE.md) — samples & tokens, `html_generator` / Step2, Roadmap, Step0/1 LLM stack (`minimax_utils`, …) |


This README stays high-level; **full variant fields and implementation detail** live in `CLAUDE.md`.

## Features

- **13 design themes** — 7 dark + 6 light; each is a full 1920×1080 template pack with its own palette and tone, wired to every style variant below (see **Design themes**)
- **3 input sources** — Feishu docs, local `.md`/`.txt` files, web pages
- **3 output formats** — MP4 video (with TTS narration), PDF, interactive HTML slideshow
- **22 style variants** — narrative, data, flow, compare, architecture/funnel, cards, code, and hybrid layouts—unified look per theme (see **Style variants**)
- **Layout hints** — many variants offer alternate compositions (dense grids, cards, wide left/right, swimlanes, …) without changing the base style
- **Adaptive typography** — font sizes, grid columns, and density classes adjust to content length automatically
- **In-slide motion (HTML / screenshots)** — `design_params.page_animations` and `page_animation_preset` (`none` / `fade` / `stagger`); interactive `presentation.html` replays entrance motion on page change; `presentation_static.html` is PNG-only frames aligned with PDF
- **8 independent steps** — run the full pipeline or any step in isolation; all intermediate artifacts are persisted to disk
- **Outline + script** — every export includes `outline.md` and `script.md`
- **Shipped docs** — `SKILL.md`, `CLAUDE.md`, and `_meta.json` ship with the npm package (see **Documentation split** and **Execution & setup** below)

* * *

## Design themes

Each theme is a **complete visual system**: typography, palette, panel treatment, ornament, and light/dark mood are authored once under `samples/` and applied across **covers, body slides, data, and flow layouts**—so the deck reads as one production, not a patchwork of one-offs.

The repo ships **13** finished themes (7 dark / 6 light), all wired to the **22 style variants** below—switching themes changes the “film grade and art direction” while timelines, funnels, compares, stacks, and the rest stay available.

Set `design_mode` in JSON to **pin** a theme id; omit it for automatic selection (priority and rules: **Execution & setup → How `design_mode` is resolved** below).

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


* * *

## Style variants

**22** built-in layouts span everything from a single strong message to layered technical storytelling; **all variants work with all 13 themes**, so you can swap the art direction without giving up compare views, funnels, stacks, or timelines.

- **Narrative & reading** — hero text, bullet panels, two-column prose, pull quotes, big-number emphasis, and more.
- **Data & metrics** — multi-stat boards, tables, light charts, and hybrids (e.g. number + bullets, list + stat).
- **Flow & structure** — timelines, stage rails and swimlanes, layered architecture stacks, conversion funnels, side-by-side contrast (e.g. before/after).
- **Showcase & assets** — icon/emoji grids, card walls, code blocks, section nav bars, text + icon mixes.

Many variants also support **alternate compositions** (multi-column grids, card layouts, asymmetric columns, swimlanes, …) via `layout_hint`—**change layout without changing the base variant**. Common variant ids and usage are in `SKILL.md`; **full fields and inference rules** are in `CLAUDE.md` (“样张系统”, “step2_design.js 核心逻辑”). The subsection **How variants and layout hints are chosen** below is an execution-order summary.

* * *

## Execution & setup

After clone or install: **how to run and which JSON fields to send** are in **[SKILL.md](SKILL.md)**; **[_meta.json](_meta.json)** ships with the package for host discovery and machine validation. Use **[CLAUDE.md](CLAUDE.md)** when changing templates or debugging.

| File | Role |
| --- | --- |
| **SKILL.md** | **Execution notes**: `command`, inputs, pipeline, deliverables, pre-run checklist, dependency list, all 13 theme ids, step examples; **`presentation.html` must ship with every `page_*.html` in the same folder** |
| **CLAUDE.md** | In-repo development: samples & tokens, `html_generator`, Roadmap, Step0/1 and `steps/utils/minimax_utils.js`, etc. |
| **_meta.json** | Host side: `type: agent`, `executor`, machine `input`/`output` for OpenClaw, npm, CI, etc. |
| **executor.js** | Single entrypoint: one JSON object on `stdin` → `node executor.js` (examples in SKILL.md) |

`npm pack` / `npm publish` tarballs include **SKILL.md**, **CLAUDE.md**, and **_meta.json** alongside `steps/`, `samples/`, and other runtime files.

### Before the first run (recommended)

Confirm `format`, `channel`, and `source` before invoking `executor.js`. **Do not** silently default to `format: "video"` (slowest path; needs FFmpeg and TTS).

1. **Source** — Feishu URL, local `.md`/`.txt`, or web URL? (`source`)
2. **Formats** — PDF / HTML / video / multiple? (`format`); if **video**, need **FFmpeg**, **edge-tts** (or macOS **`say`**)
3. **Channel** — local `output_dir` or **Feishu**? (`channel`); **feishu** needs `.env` credentials plus **`doc_title`**, **`folder_token`**, etc.
4. **(Optional)** — **`design_mode`**, **`output_dir`**, **`page_animations: false`**?

`request.json` / OpenClaw (no shell pipe): see **[SKILL.md](SKILL.md)** (“跑前与用户确认”, “最小执行”).

### Pre-run dependencies (see SKILL)

No single upfront probe; missing **LLM, ffmpeg/ffprobe, TTS, Feishu** setup fails at the relevant step (stderr). Before the first run, read **[SKILL.md](SKILL.md)** — **「依赖不足时会发生什么」** and **「依赖准备清单」** (copy-paste checks); pre-run checklist item **6** is the dependency gate.

### How `design_mode` is resolved

Matches the **Design themes** section above. When `design_mode` is **not** in the current request JSON, resolution order is:

1. **`recommended_design_mode`** from Step0 in `project.json` (when the LLM returns the object wrapper with a valid theme id).
2. **`design_mode`** in `project.json` if set and not the default `electric-studio`.
3. **Content-keyword rules** (`inferContentType` + `CONTENT_TYPE_MAP`), e.g. humanities / curation → **`dark-botanical`**.

An explicit `design_mode` in the **current** `executor.js` JSON always wins.

### How variants and layout hints are chosen

Step 0 structures content into scenes with suggested layouts; Step 2 **infers and rhythm-corrects** variants (so consecutive slides do not all look identical). `layout_hint` tweaks composition **without swapping the HTML template**. For full manual control, edit `scenes.json` / `design_params.json` and re-run from the relevant step.

* * *

## Quick Start

```bash
# 1. Install
git clone https://github.com/mochueloxie-sudo/SlideForge.git
cd slide-forge
npm install

# 2. Configure
cp .env.example .env
# Edit .env → follow .env.example for Step0/1 LLM and optional services

# 3. Run (one command)
echo '{"command":"all","source":"./examples/test_article.md","format":"html","output_dir":"./output"}' | node executor.js
# Optional: pin a theme (see “Design themes” above)
# echo '{"command":"all","source":"./examples/test_article.md","format":"html","output_dir":"./output","design_mode":"deep-tech-keynote"}' | node executor.js

# 4. Open the result
open ./output/presentation.html   # primary; PNG carousel: presentation_static.html
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

* * *

## Pipeline

```
Source (Feishu / .md / URL)
  │
  ▼
Step 0 ── Content Analysis ──────── LLM (HTTP, see .env) → scenes.json
  │
  ▼
Step 1 ── Script Generation ─────── LLM (HTTP) → scenes[].script
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

* * *

## Requirements


| Dependency          | Purpose                               | Install                                   |
| ------------------- | ------------------------------------- | ----------------------------------------- |
| **Node.js ≥ 18**    | Runtime                               | [nodejs.org](https://nodejs.org/)         |
| **Google Chrome**   | Screenshots + PDF (Step 4/6)          | Usually pre-installed                     |
| **LLM (Step0/1)** | Content analysis + scripts | See **`.env.example`** (**`MINIMAX_*` recommended**; otherwise **`LLM_*`**) |
| `edge-tts`          | TTS narration (Step 5, video only)    | `pip install edge-tts`                    |
| `ffmpeg`            | Video encoding (Step 6, video only)   | `brew install ffmpeg`                     |
| `lark-cli`          | Feishu publishing (Step 7, optional)  | `npm i -g @larksuite/cli`                 |


### Environment Variables

Copy `.env.example` to `.env` and fill in:

```ini
# Step0/1 LLM: prefer MINIMAX_* (MiniMax); if no MiniMax key, use LLM_* (other compatible endpoints; MINIMAX_* wins if both set)
MINIMAX_API_KEY=sk-...
MINIMAX_MODEL=MiniMax-M2.7-highspeed
MINIMAX_BASE_URL=https://api.minimax.chat/v1
# LLM_API_KEY=sk-...
# LLM_MODEL=gpt-4o-mini
# LLM_BASE_URL=https://api.openai.com/v1

# Optional — Feishu integration
FEISHU_APP_ID=cli_...
FEISHU_APP_SECRET=...
```

### Step0/1 and JSON (implementation)

Step0/1 call a **configured LLM over HTTP** (**`MINIMAX_*` recommended**; if no MiniMax key, use **`LLM_*`** — see **`.env.example`**; when both are set, **`MINIMAX_*` wins**). Implementation lives in **`steps/utils/minimax_utils.js`**: OpenAI Chat Completions–compatible HTTP, JSON extraction, and backoff on HTTP 429/5xx and parse failures. See **[CLAUDE.md](CLAUDE.md)** (post-`refs/` *Roadmap* block, heading **P2 — LLM 稳定性优化**) for details and limits.

* * *

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
├── presentation.html        # Primary: iframe slides (hover + motion)
├── presentation_static.html # PNG carousel (same as PDF frames)
├── presentation.pdf       # PDF document (format=pdf)
├── presentation.mp4       # Video with narration (format=video)
├── outline.md             # Content outline
├── script.md              # Full narration script
└── MANIFEST.md            # Delivery manifest (channel=local)
```

### format=html: two browser entrypoints (delivery)

| File | Works as a single file? | Must ship with | Motion / interaction |
| --- | --- | --- | --- |
| **`presentation.html`** | **No** (iframe shell) | **All** `page_001.html` … `page_NNN.html` in the **same directory** | Yes: hover + CSS entrance inside iframe |
| **`presentation_static.html`** | **Yes** (PNG base64) | Nothing else | No in-template interaction; static flipbook aligned with PDF |

- For **`presentation.html`**, ship at least that file + **every `page_*.html`** (whole folder or zip). The file includes an HTML comment after `<!DOCTYPE>` reminding you.
- **Single-file sharing**: use **`presentation_static.html`** or **PDF**; do not equate the static carousel with the interactive iframe entry.

* * *

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

* * *

## Automation & tool integration

`stdin` → `executor.js` → `stdout`; JSON contract in [_meta.json](_meta.json); **human-oriented execution notes** in [SKILL.md](SKILL.md).

- **Claude Code, etc.** — register `SKILL.md` per client rules
- **OpenClaw** — discover package via `_meta.json`
- **Scripts / CI** — pipe one JSON line or `node executor.js ./request.json`

Contributor and debugging notes: [CLAUDE.md](CLAUDE.md).

* * *

## Project Structure

```
slide-forge/
├── executor.js                     # Entry point — routes commands to steps
├── _meta.json                      # Host schema (shipped with npm)
├── SKILL.md                        # Execution notes (command / deps / delivery)
├── CLAUDE.md                       # In-repo dev guide (samples, steps, Roadmap, LLM)
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
│       ├── minimax_utils.js        # Step0/1: MiniMax chat + JSON rules/extract + retries
│       ├── llm_client.js           # MiniMax HTTP (legacy compat)
│       ├── tool-locator.js         # System tool auto-discovery
│       └── step-utils.js           # Shared utilities
├── utils/
│   ├── html_generator.js           # Core: template loading + token replacement
│   └── screenshot.js               # Puppeteer wrapper
├── refs/                           # Design reference docs (see refs/README.md)
├── samples/                        # Design theme templates
│   ├── electric-studio/            # 13 theme directories, each with full variant set
│   ├── bold-signal/
│   ├── ...
│   └── shared/                     # Theme-agnostic variants (stats, timeline, etc.)
├── examples/
│   ├── test_article.md             # Sample article for testing
│   ├── tencent_intro_light.md      # Long-form corp. intro sample (e.g. swiss-modern)
│   ├── full_variant_test.md        # Full variant coverage test
│   ├── four_new_variants_scenes.json # compare / process_flow / architecture_stack / funnel smoke deck
│   └── scenes_example.json         # Manual scenes.json reference
├── .env.example                    # Environment variable template
├── CHANGELOG.md                    # Version history (user-facing)
└── package.json
```

* * *

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Follow the design principles (see **[CLAUDE.md](CLAUDE.md)** for extension steps and grep debugging):
  - **Templates over code** — all visual decisions live in `samples/*.html`, not in generator logic
  - **Fixed pixels** — templates use `px` units (1920×1080 target), never `rem`/`vw`
  - **Generator is a pipe** — load template → replace tokens → write file
  - **Token naming** — `{{UPPER_CASE}}`, repeat markers have no index
4. Test with `npm run test:e2e`
5. Open a PR

* * *

## License

[MIT](LICENSE)