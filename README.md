# SlideForge

> 将任何文档在 10 分钟内转换为精致的 1920×1080 演示文稿 — 支持视频、PDF 或交互式 HTML。

[English](README_en.md)
[更新记录](CHANGELOG.md)
[Agent 技能：SKILL.md](SKILL.md)
[Node.js](https://nodejs.org/)
[License: MIT](LICENSE)
[Version](_meta.json)

**本仓库优先面向 AI Agent 使用**：通过标准技能描述与 JSON 契约，让 **Cursor、Codex、OpenClaw / Clawdbot** 等主流 Agent 在沙箱或本机中调用同一套 `executor.js` 流水线（stdin JSON → stdout 结果）。人类开发者也可直接 `node executor.js` 使用。

传入飞书文档、Markdown 文件或任意 URL，Pipeline 会使用 MiniMax LLM 分析内容，自动选择 **13 种设计主题**，渲染像素级精确的 HTML 幻灯片，并按你选择的格式打包输出 — 全程自动化。

**[查看示例输出 →](examples/demo-output/)** 在浏览器中打开 `presentation.html`（iframe 单页，支持 hover / 入场动画）；纯截图轮播见 `presentation_static.html`。

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
- **Agent 就绪** — `SKILL.md` + `_meta.json` 与 npm 包同源发布（见下文「Agent 接入必读」）

---

## 设计主题

每一套主题都是 **独立的整包视觉系统**：字体、色板、面板质感、装饰元素与明暗氛围在 `samples/` 中一次性定稿，**同一套主题会驱动封面、正文、数据页与流程页等所有版式**，保证整场演示像「一套成片」而非零散拼凑。

仓库内置 **13 套** 成品主题（7 深色 / 6 浅色），并与 **22 种样式变体** 全量打通——换主题只换「电影调色与美术」，内容结构仍可走时间线、漏斗、对照、架构栈等任意组合。

在 JSON 里用 `design_mode` 可**锁定**某一主题 id；不传则由流水线自动选用（优先级与规则见下文 **「Agent 接入必读」→ 主题如何被选中**）。

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


---

## 样式变体

**22 种**内置版式覆盖从「一句话讲清楚」到「复杂信息分层展示」的常见演示需求；所有变体均已接入 **13 套主题**，换主题即可在同一结构上切换整套美术风格。

- **叙事与阅读** — 大标题与纯文字重点、要点面板、双栏长文、高亮引言、单页大数字强调等。
- **数据与指标** — 多指标看板、表格、轻量图表，以及「数字 + 列表」「列表 + 指标」等混合数据页。
- **流程与结构** — 时间线、横向阶段条与泳道、分层架构栈、转化漏斗、双栏对照（Before/After 等）。
- **展示与资产** — 图标/emoji 栅格、卡片墙、代码片段、章节导航条、图文混排等。

多数变体还支持 **多种构图密度**（例如多列网格、卡片式排布、左右栏宽窄比例、泳道布局等）；流水线里通过 `layout_hint` 选用，**不必换「样式」即可换版式**。字段名、合法取值与机器可读的变体 id 见 `**SKILL.md`**；推断与校正逻辑见下文 **「Agent 接入必读」→ 样式与布局如何被选中**。

---

## Agent 接入必读

面向 **Cursor、Codex、OpenClaw / Clawdbot** 等：将本仓库或 npm 包置于可执行路径后，**务必**阅读并挂载 `**SKILL.md`**（完整 schema 与分步示例与 `_meta.json` 一致）。


| 文件                | 作用                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `**SKILL.md**`    | **必选技能包**：YAML 前置元数据（`type: agent`、`input`/`output` schema、**含 13 主题 id 枚举**）+ 分步命令说明与示例；按各 Agent 平台的「技能 / Skill / Plugin」规则挂载到工作区即可。 |
| `**_meta.json`**  | 轻量机器可读清单（版本、`command` 枚举、`executor` 路径），便于自动化发现与 UI 展示。                                                                               |
| `**executor.js**` | 唯一入口：`echo '<json>' | node executor.js`；与 `SKILL.md` 中的示例一致。                                                                          |


`**npm pack` / `npm publish` 发布的 tarball 已包含 `SKILL.md` 与 `_meta.json**`，与 `steps/`、`samples/` 等运行所需文件一并分发，无需再手工拷贝技能文件。

### 主题如何被选中（`design_mode`）

与上文「设计主题」展示相对应，执行时的解析顺序如下（**当次 JSON 里显式传入的 `design_mode` 始终最高**）：

1. `project.json` 中 Step 0 写入的 `**recommended_design_mode`**（模型返回对象且 id 合法）。
2. `project.json` 中的 `**design_mode**`（且不等于默认 `electric-studio`）。
3. 正文与标题关键词规则（`inferContentType` + `CONTENT_TYPE_MAP`），例如人文 / 社科 / 策展等 → `**dark-botanical**`。

### 样式与布局如何被选中（`content_variant` / `layout_hint`）

Step 0 将内容结构化为场景与建议版式；Step 2 结合规则做 **变体推断与节奏校正**（避免连续多页同一构图显得单调）。`layout_hint` 在**不换 HTML 模板**的前提下微调同一变体的排布。需要完全手工控制时，可编辑 `scenes.json` / `design_params.json` 后从对应 Step 重跑。

---

## 快速开始

```bash
# 1. 安装
git clone https://github.com/mochueloxie-sudo/SlideForge.git
cd slide-forge
npm install

# 2. 配置
cp .env.example .env
# 编辑 .env → 添加 MINIMAX_API_KEY（必填）

# 3. 运行（一行命令）
echo '{"command":"all","source":"./examples/test_article.md","format":"html","output_dir":"./output"}' | node executor.js
# 可选：锁定视觉主题（见上文「设计主题」）
# echo '{"command":"all","source":"./examples/test_article.md","format":"html","output_dir":"./output","design_mode":"deep-tech-keynote"}' | node executor.js

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

---

## 流程图

```
输入源（飞书 / .md / URL）
  │
  ▼
Step 0 ── 内容分析 ─────────── MiniMax LLM → scenes.json
  │
  ▼
Step 1 ── 逐字稿生成 ───────── MiniMax LLM → scenes[].script
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

每个步骤都读写磁盘 JSON 文件，支持单独重跑任意步骤、检查中间产物，或手动编辑 `scenes.json` 后继续。

---

## 环境要求


| 依赖                  | 用途                   | 安装方式                                      |
| ------------------- | -------------------- | ----------------------------------------- |
| **Node.js ≥ 18**    | 运行环境                 | [nodejs.org](https://nodejs.org/)         |
| **Google Chrome**   | 截图 + PDF（Step 4/6）   | 通常已预装                                     |
| **MiniMax API Key** | 内容分析 + 逐字稿（Step 0/1） | [minimax.chat](https://api.minimax.chat/) |
| `edge-tts`          | TTS 配音（Step 5，仅视频格式） | `pip install edge-tts`                    |
| `ffmpeg`            | 视频编码（Step 6，仅视频格式）   | `brew install ffmpeg`                     |
| `lark-cli`          | 飞书发布（Step 7，可选）      | `npm i -g @larksuite/cli`                 |


### 环境变量

复制 `.env.example` 到 `.env` 并填写：

```ini
# 必填
MINIMAX_API_KEY=sk-...
MINIMAX_MODEL=MiniMax-M2.7-highspeed
MINIMAX_BASE_URL=https://api.minimax.chat/v1

# 可选 — 飞书集成
FEISHU_APP_ID=cli_...
FEISHU_APP_SECRET=...
```

---

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

---

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

---

## Agent 集成

SlideForge 通过 `stdin` → `executor.js` → `stdout` 暴露标准 JSON 输入/输出接口，兼容任意 AI Agent 框架：

- **Claude Code** — 通过 `SKILL.md` 作为 skill 使用
- **OpenClaw** — 通过 `_meta.json` 自动发现
- **自定义 Agent** — 向 `node executor.js` 管道传输 JSON 命令

详见 `[_meta.json](_meta.json)` 的完整输入/输出 schema，以及 `[SKILL.md](SKILL.md)` 的 Agent skill 规范。

---

## 项目结构

```
slide-forge/
├── executor.js                     # 入口 — 将命令路由到各步骤
├── _meta.json                      # Agent 集成 schema
├── SKILL.md                        # Agent skill 规范
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
│       ├── llm_client.js           # MiniMax HTTP 客户端
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
├── SKILL.md                        # Agent 技能包（YAML + 用法，与 npm 包一并发布）
├── _meta.json                      # Agent 清单（版本、schema、executor 指针）
├── .env.example                    # 环境变量模板
├── CHANGELOG.md                    # 版本与用户向变更记录
└── package.json
```

---

## 参与贡献

1. Fork 本仓库
2. 创建功能分支（`git checkout -b feat/my-feature`）
3. 遵循设计原则：
  - **模板优于代码** — 所有视觉决策放在 `samples/*.html`，不写在生成器逻辑里
  - **固定像素** — 模板使用 `px` 单位（目标 1920×1080），不用 `rem`/`vw`
  - **生成器是管道** — 加载模板 → 替换 token → 写出文件
  - **Token 命名** — `{{UPPER_CASE}}`，重复标记不带索引
4. 用 `npm run test:e2e` 测试
5. 提交 PR

---

## 许可证

[MIT](LICENSE)