# SlideForge

> 将飞书 / Markdown / 网页收成可上台讲的 **1920×1080** 演示 — 可选 **video**、**pdf**、**html**（可多选），附大纲与逐字稿；Step0/1 走本机 `.env` 里的 LLM，与聊天窗口里的大模型不是同一条链。

[English](README_en.md)
[更新记录](CHANGELOG.md)
[SKILL.md（执行说明）](SKILL.md)
[开发指南：CLAUDE.md](CLAUDE.md)
[Node.js](https://nodejs.org/)
[License: MIT](LICENSE)
[Version](_meta.json)

**用途**：飞书 / Markdown / URL → **1920×1080** 演示（视频、PDF、交互式 HTML）。入口为 `node executor.js` + stdin 一行 JSON；**Cursor、Codex、OpenClaw** 等客户端可按各自「技能 / 工具」机制挂载本仓库，**执行细节以 [SKILL.md](SKILL.md) 为准**（平台元数据见 `_meta.json`）。

从零生成时，Step0/1 会在子进程内调用 **环境变量中配置的 LLM**（变量名见 **`.env.example`**）；**13** 套视觉主题可在 JSON 里用 **`design_mode`** 锁定，**省略**则由 Step0 推荐 + Step2 规则自动落版，再按 `format` 打包。

**[查看示例输出 →](examples/demo-output/)** 在浏览器中打开 `presentation.html`（iframe 壳 + 同目录 `page_*.html`，支持 hover / 入场动画；**勿只拷贝单个 HTML**）；纯截图单文件轮播见 `presentation_static.html`。

## 文档分工


| 读者 | 文件 |
| --- | --- |
| **使用与执行** | [SKILL.md](SKILL.md) — **首次运行 Onboarding**（明确意图 → **按 format 收窄**的配置检查 → 执行 → 交付说明）、`command`、Pipeline、13 主题 id、`presentation.html` / `presentation_static.html`、飞书与分步示例 |
| **开发与排障** | [CLAUDE.md](CLAUDE.md) — 样张与 token、`html_generator` / Step2、Roadmap、Step0/1 LLM 工具链（`minimax_utils` 等）、调试 |


## 功能特性

- **13 种设计主题** — 7 深色 + 6 浅色，每套均为完整 1920×1080 样张包，气质与色板各不相同，且均覆盖下方全部样式变体（见「设计主题」）
- **3 种输入源** — 飞书文档、本地 `.md`/`.txt` 文件、网页
- **3 种输出格式** — MP4 视频（含 TTS 配音）、PDF、交互式 HTML 幻灯片
- **22 种样式变体** — 叙事、数据、流程、对照、架构/漏斗、卡片与代码等版式一应俱全，同一主题下视觉语言统一（见「样式变体」）
- **布局提示** — 多数变体支持多种排布（密铺网格、卡片、宽左/右栏、泳道等），同一张「样式」换构图不换主题
- **自适应排版** — 字号、栅格列数、内容密度自动适应文字长度
- **页内动效（HTML / 截图）** — `design_params.page_animations` 与 `page_animation_preset`（`none` / `fade` / `stagger`）；交互式 `presentation.html` 翻页可重播入场；`presentation_static.html` 为纯截图帧与 PDF 对齐
- **8 个独立步骤** — 运行完整流程或单独重跑任意步骤；所有中间产物持久化到磁盘
- **大纲 + 逐字稿** — 每次导出都附带 `outline.md` 和 `script.md`
- **随包文档** — `SKILL.md`、`CLAUDE.md`、`_meta.json` 与 npm 包同源发布（见「文档分工」与「执行与接入」）

***

## 设计主题

每一套主题都是 **独立的整包视觉系统**：字体、色板、面板质感、装饰元素与明暗氛围在 `samples/` 中一次性定稿，**同一套主题会驱动封面、正文、数据页与流程页等所有版式**，保证整场演示像「一套成片」而非零散拼凑。

仓库内置 **13 套** 成品主题（7 深色 / 6 浅色），并与 **22 种样式变体** 全量打通——换主题只换「电影调色与美术」，内容结构仍可走时间线、漏斗、对照、架构栈等任意组合。

在 JSON 里用 `design_mode` 可**锁定**某一主题 id；不传则由流水线自动选用（优先级与规则见下文 **「执行与接入」→ 主题如何被选中**）。

### 深色主题


| 主题                  | 强调色          | 适用场景     |
| ------------------- | ------------ | -------- |
| `electric-studio`   | 蓝紫 + 天蓝      | 通用（默认兜底） |
| `bold-signal`       | 橙红           | 商业、品牌、营销 |
| `creative-voltage`  | 电蓝           | 创意、设计、艺术 |
| `dark-botanical`    | 暖金           | 人文、教育、社科 |
| `neon-cyber`        | 霓虹青 + 紫      | 科幻、AI、游戏 |
| `terminal-green`    | GitHub 绿 + 蓝 | 技术文档、API |
| `deep-tech-keynote` | 天蓝 + 蓝紫      | 技术演讲     |


### 浅色主题


| 主题                  | 强调色      | 适用场景   |
| ------------------- | -------- | ------ |
| `swiss-modern`      | 纯黑       | 极简、瑞士风 |
| `paper-ink`         | 红 + 黑    | 编辑、出版  |
| `vintage-editorial` | 棕金       | 复古、文艺  |
| `notebook-tabs`     | 薄荷绿      | 笔记、手账  |
| `pastel-geometry`   | 粉 + 几何色块 | 轻快、活泼  |
| `split-pastel`      | 柔粉 + 蓝   | 温柔、女性化 |


***

## 样式变体

**22 种**内置版式覆盖从「一句话讲清楚」到「复杂信息分层展示」的常见演示需求；所有变体均已接入 **13 套主题**，换主题即可在同一结构上切换整套美术风格。

- **叙事与阅读** — 大标题与纯文字重点、要点面板、双栏长文、高亮引言、单页大数字强调等。
- **数据与指标** — 多指标看板、表格、轻量图表，以及「数字 + 列表」「列表 + 指标」等混合数据页。
- **流程与结构** — 时间线、横向阶段条与泳道、分层架构栈、转化漏斗、双栏对照（Before/After 等）。
- **展示与资产** — 图标/emoji 栅格、卡片墙、代码片段、章节导航条、图文混排等。

多数变体还支持 **多种构图密度**（例如多列网格、卡片式排布、左右栏宽窄比例、泳道布局等）；流水线里通过 `layout_hint` 选用，**不必换「样式」即可换版式**。常用变体 id 与入参见 `SKILL.md`；**完整字段与推断规则** 见 `CLAUDE.md`「样张系统」与「step2_design.js 核心逻辑」；下文 **「样式与布局如何被选中」** 为执行顺序摘要。

***

## 执行与接入

将本仓库或 npm 包置于可执行路径后：**运行方式与 JSON 字段**以 **[SKILL.md](SKILL.md)** 为准；**[_meta.json](_meta.json)** 与包一并发布，供宿主发现、索引与机器校验。改样张或排障用 **[CLAUDE.md](CLAUDE.md)**。

| 文件 | 作用 |
| --- | --- |
| **SKILL.md** | **执行说明**：Onboarding、按意图收窄的依赖核对、`command`、Pipeline、交付物、13 主题 id（含「自动」不传 `design_mode`）、分步示例；**`presentation.html` 须与同目录全部 `page_*.html` 一并分发** |
| **CLAUDE.md** | 仓库内开发：样张与 token、`html_generator`、Roadmap、Step0/1 与 `steps/utils/minimax_utils.js` 等 |
| **_meta.json** | 宿主侧：`type: agent`、`executor`、机器可读 `input`/`output`，供 OpenClaw、npm、CI 等 |
| **executor.js** | 唯一入口：`stdin` 一行 JSON → `node executor.js`（示例见 SKILL.md） |

`npm pack` / `npm publish` 发布的 tarball 已包含 **SKILL.md**、**CLAUDE.md** 与 **_meta.json**，与 `steps/`、`samples/` 等一并分发。

### 跑流水线前先确认（推荐）

在调用 `executor.js` **之前**宜与用户确认，再写入 `format`、`channel`、`source` 等。**不要**在未确认时默认 `format: "video"`（耗时长，且依赖 FFmpeg、TTS）。

1. **内容来源** — 飞书、本地 `.md`/`.txt`、网页 URL？（`source`）
2. **交付格式** — PDF / HTML / 视频 / 多选？（`format`）；含 **video** 需 **FFmpeg**、**edge-tts**（或 macOS **`say`**）
3. **交付渠道** — 本地 `output_dir` 或飞书？（`channel`）；**feishu** 需 `.env` 凭证及 **`doc_title`**、**`folder_token`** 等
4. **视觉主题** — **主动**说明 13 个 `design_mode` id（见 SKILL 话术与主题表）；用户指定其一写入 JSON，或说「自动」则**不传** `design_mode`。**不要**在跑前清单里问用户是否关闭页内动效（用实现默认，除非用户主动要求改 JSON）。

`request.json`、OpenClaw 无管道写法见 **[SKILL.md](SKILL.md)**（「首次运行 — Onboarding」「执行 — 日常调用」）。

### 跑前依赖（详见 SKILL）

流水线**不会**做一键预检；缺 **LLM、FFmpeg/ffprobe、TTS、飞书** 等在对应 Step 失败（见 stderr）。第一次跑前请读 **[SKILL.md](SKILL.md)**「首次运行 — Onboarding」**第二步（检查配置项）**及其中 **E. 缺配置时的典型报错落点**（含自检命令）；核对范围应随用户已选的 **`format` / `channel` / `source`** 收窄，勿要求装齐用不到的链。

### 主题如何被选中（`design_mode`）

与上文「设计主题」展示相对应，执行时的解析顺序如下（**当次 JSON 里显式传入的 `design_mode` 始终最高**）：

1. `project.json` 中 Step0 写入的 **`recommended_design_mode`**（对象响应且 id 合法）。
2. `project.json` 中的 **`design_mode`**（且不等于默认 `electric-studio`）。
3. 正文与标题关键词规则（`inferContentType` + `CONTENT_TYPE_MAP`），例如人文 / 社科 / 策展等 → **`dark-botanical`**。

### 样式与布局如何被选中（`content_variant` / `layout_hint`）

Step 0 将内容结构化为场景与建议版式；Step 2 结合规则做 **变体推断与节奏校正**（避免连续多页同一构图显得单调）。`layout_hint` 在**不换 HTML 模板**的前提下微调同一变体的排布。需要完全手工控制时，可编辑 `scenes.json` / `design_params.json` 后从对应 Step 重跑。

***

## 快速开始

```bash
# 1. 安装
git clone https://github.com/mochueloxie-sudo/SlideForge.git
cd slide-forge
npm install

# 2. 配置
cp .env.example .env
# 编辑 .env → 按 .env.example 配置 Step0/1 所需 LLM 等

# 3. 运行（一行命令）
echo '{"command":"all","source":"./examples/tencent_intro_light.md","format":"html","output_dir":"./output"}' | node executor.js
# 可选：锁定视觉主题（见上文「设计主题」）
# echo '{"command":"all","source":"./examples/tencent_intro_light.md","format":"html","output_dir":"./output","design_mode":"deep-tech-keynote"}' | node executor.js

# 4. 打开结果
open ./output/presentation.html   # 主入口；静态图轮播：presentation_static.html
```

### 其他格式

```bash
# PDF
echo '{"command":"all","source":"./article.md","format":"pdf","output_dir":"./out"}' | node executor.js

# 视频（需安装 ffmpeg + edge-tts）
echo '{"command":"all","source":"./article.md","format":"video","output_dir":"./out"}' | node executor.js

# 同时生成多种格式
echo '{"command":"all","source":"./article.md","format":["pdf","html"],"output_dir":"./out"}' | node executor.js
```

***

## 流程图

```
输入源（飞书 / .md / URL）
  │
  ▼
Step 0 ── 内容分析 ─────────── LLM（HTTP，见 .env）→ scenes.json
  │
  ▼
Step 1 ── 逐字稿生成 ───────── LLM（HTTP）→ scenes[].script
  │
  ▼
Step 2 ── 设计参数 ─────────── 本地 preset → design_params.json
  │                               (显式 design_mode / Step0 推荐 / project 保存 / 关键词规则 + 变体与布局提示)
  ▼
Step 3 ── HTML 渲染 ────────── 模板 token 替换 → page_XXX.html
  │
  ▼
Step 4 ── 截图 ───────────── Puppeteer → page_XXX.png (1920×1080)
  │
  ▼
Step 5 ── TTS 配音 ────────── edge-tts → page_XXX.mp3（不生成视频时跳过）
  │
  ▼
Step 6 ── 交付格式 ─────────── video / pdf / html + outline.md + script.md
  │
  ▼
Step 7 ── 交付渠道 ─────────── local（默认）/ feishu
```

每个步骤都读写磁盘 JSON 文件；在**已有本机前置 Step 产物**的前提下，可对后续 Step 单独补跑或检查中间产物。Agent 面向用户的说明以 **[SKILL.md](SKILL.md)** 为准（含「按 `format` 裁剪分步命令」等约定）。

***

## 环境要求


| 依赖                  | 用途                   | 安装方式                                      |
| ------------------- | -------------------- | ----------------------------------------- |
| **Node.js ≥ 18**    | 运行环境                 | [nodejs.org](https://nodejs.org/)         |
| **Google Chrome**   | 截图 + PDF（Step 4/6）   | 通常已预装                                     |
| **LLM（Step0/1）** | 内容分析 + 逐字稿 | 见 **`.env.example`**（**建议 `MINIMAX_*`**；无 MiniMax 再用 **`LLM_*`**） |
| `edge-tts`          | TTS 配音（Step 5，仅视频格式） | `pip install edge-tts`                    |
| `ffmpeg`            | 视频编码（Step 6，仅视频格式）   | `brew install ffmpeg`                     |
| `lark-cli`          | 飞书发布（Step 7，可选）      | `npm i -g @larksuite/cli`                 |


### 环境变量

复制 `.env.example` 到 `.env` 并填写：

```ini
# Step0/1 LLM：建议 MINIMAX_*（MiniMax）；若无 key 可改用 LLM_*（其它兼容端点；二者同时存在时 MINIMAX_* 优先）
MINIMAX_API_KEY=sk-...
MINIMAX_MODEL=MiniMax-M2.7-highspeed
MINIMAX_BASE_URL=https://api.minimax.chat/v1
# LLM_API_KEY=sk-...
# LLM_MODEL=gpt-4o-mini
# LLM_BASE_URL=https://api.openai.com/v1

# 可选 — 飞书集成
FEISHU_APP_ID=cli_...
FEISHU_APP_SECRET=...
```

### Step0/1 与 JSON（实现说明）

内容分析与逐字稿在子进程内调用 **已配置的 LLM**（**建议 `MINIMAX_*`**；若无 MiniMax 再填 **`LLM_*`**，见 **`.env.example`**）。实现上 Step0/1 使用 **`steps/utils/minimax_utils.js`**：OpenAI Chat Completions 兼容 HTTP、JSON 抽取与重试。说明与局限见 **[CLAUDE.md](CLAUDE.md)**「备忘与 Roadmap」→「（二）已明确的 Roadmap」→ **P2 — LLM 稳定性优化**。

***

## 输出结构

```
output/
├── scenes.json            # 结构化场景数据 + 逐字稿
├── design_params.json     # 主题、变体、布局提示
├── page_001.html          # 渲染后的 HTML 幻灯片
├── page_002.html
├── ...
├── screenshots/
│   ├── page_001.png       # 1920×1080 截图
│   └── ...
├── presentation.html        # 主入口：iframe 单页（hover + 动效）
├── presentation_static.html # PNG 轮播（与 PDF 画面一致）
├── presentation.pdf      # PDF 文档（format=pdf）
├── presentation.mp4       # 带配音视频（format=video）
├── outline.md             # 内容大纲
├── script.md              # 完整逐字稿
└── MANIFEST.md            # 交付清单（channel=local）
```

### format=html：两种浏览器入口（交付时注意）

| 文件 | 单文件能否独立使用 | 必须与谁一起分发 | 交互 / 动效 |
| --- | --- | --- | --- |
| **`presentation.html`** | **否**（iframe 壳） | **须**与同目录全部 `page_001.html` … `page_NNN.html` | 有：各页 hover、页内 CSS 入场 |
| **`presentation_static.html`** | **是**（内嵌 PNG base64） | 无 | 无模板内交互，静帧翻页，与 PDF 画面对齐 |

- 交付 **`presentation.html`** 时：至少该文件 + 全部 **`page_*.html`**（建议整目录或 zip）。生成文件在 `<!DOCTYPE>` 下有 HTML 注释再次提示依赖。
- **单文件分享**：用 **`presentation_static.html`** 或 **PDF**；勿将静帧轮播说成与 iframe 主入口等价的「全交互幻灯片」。

***

## 分步使用

需要细粒度控制时，单独运行各步骤：

```bash
P=./project

# 内容分析
echo '{"command":"step0","source":"./article.md","output_dir":"'"$P"'"}' | node executor.js

# 生成逐字稿
echo '{"command":"step1","scenes":"'"$P"'/scenes.json","output_dir":"'"$P"'"}' | node executor.js

# 设计参数（自动主题或手动指定）
echo '{"command":"step2","scenes":"'"$P"'/scenes.json","output_dir":"'"$P"'","design_mode":"neon-cyber"}' | node executor.js

# HTML 渲染
echo '{"command":"step3","scenes":"'"$P"'/scenes.json","design_params":"'"$P"'/design_params.json","output_dir":"'"$P"'"}' | node executor.js

# 截图
echo '{"command":"step4","html_dir":"'"$P"'","output_dir":"'"$P"'/screenshots"}' | node executor.js

# 生成交付格式
echo '{"command":"step6","format":["pdf","html"],"scenes":"'"$P"'/scenes.json","screenshots_dir":"'"$P"'/screenshots","output_dir":"'"$P"'"}' | node executor.js

# 打包交付
echo '{"command":"step7","channel":"local","output_dir":"'"$P"'"}' | node executor.js
```

***

## 自动化与工具接入

`stdin` → `executor.js` → `stdout`，JSON 契约见 [_meta.json](_meta.json)；**人类可读执行说明**见 [SKILL.md](SKILL.md)。

- **Claude Code 等** — 按客户端要求注册 `SKILL.md`（机制以平台为准）
- **OpenClaw** — 通过 `_meta.json` 发现包与 schema
- **脚本 / CI** — 管道传入一行 JSON 或 `node executor.js ./request.json`

开发与排障：[CLAUDE.md](CLAUDE.md)。

***

## 项目结构

```
slide-forge/
├── executor.js                     # 入口 — 将命令路由到各步骤
├── _meta.json                      # 宿主 schema（与 npm 同发）
├── SKILL.md                        # 执行说明（command / 依赖 / 交付）
├── CLAUDE.md                       # 仓库内开发指南（样张、Step、Roadmap、LLM）
├── steps/
│   ├── step0_analyze.js            # 内容分析（MiniMax LLM）
│   ├── step1_script.js             # 逐字稿生成（MiniMax LLM）
│   ├── step2_design.js             # 主题选择 + 变体推断
│   ├── step3_html.js               # HTML 渲染（模板引擎）
│   ├── step4_screenshot.js         # Puppeteer 截图
│   ├── step5_tts.js                # TTS（edge-tts → say 降级）
│   ├── step6_format.js             # 交付格式（video/pdf/html）
│   ├── step6_video.js              # FFmpeg 视频编码（内部）
│   ├── step7_channel.js            # 交付渠道（local/feishu）
│   ├── step7_publish.js            # 飞书发布（内部）
│   └── utils/
│       ├── content_extractor.js    # 多源内容提取
│       ├── minimax_utils.js        # Step0/1：MiniMax Chat + JSON 约束/抽取 + 重试
│       ├── llm_client.js           # MiniMax HTTP（历史兼容）
│       ├── tool-locator.js         # 系统工具自动发现
│       └── step-utils.js           # 共享工具
├── utils/
│   ├── html_generator.js           # 核心：模板加载 + token 替换
│   └── screenshot.js               # Puppeteer 封装
├── refs/                           # 设计参考（STYLE_PRESETS 等，见 refs/README.md）
├── samples/                        # 设计主题模板
│   ├── electric-studio/            # 13 个主题目录，每个含完整变体集
│   ├── bold-signal/
│   ├── ...
│   └── shared/                     # 主题无关变体（stats、timeline 等）
├── examples/
│   ├── test_article.md             # 测试用示例文章
│   ├── tencent_intro_light.md    # 长文企业介绍示例（如 swiss-modern）
│   ├── full_variant_test.md        # 全变体覆盖测试
│   ├── four_new_variants_scenes.json # compare / process_flow / architecture_stack / funnel 目检
│   └── scenes_example.json         # 手动 scenes.json 参考
├── .env.example                    # 环境变量模板
├── CHANGELOG.md                    # 版本与用户向变更记录
└── package.json
```

***

## 参与贡献

1. Fork 本仓库
2. 创建功能分支（`git checkout -b feat/my-feature`）
3. 遵循设计原则（扩展步骤与 grep 调试见 **[CLAUDE.md](CLAUDE.md)**）：
  - **模板优于代码** — 所有视觉决策放在 `samples/*.html`，不写在生成器逻辑里
  - **固定像素** — 模板使用 `px` 单位（目标 1920×1080），不用 `rem`/`vw`
  - **生成器是管道** — 加载模板 → 替换 token → 写出文件
  - **Token 命名** — `{{UPPER_CASE}}`，重复标记不带索引
4. 用 `npm run test:e2e` 测试
5. 提交 PR

***

## 许可证

[MIT](LICENSE)