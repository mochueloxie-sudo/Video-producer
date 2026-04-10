# SlideForge

> 将任何文档在 10 分钟内转换为精致的 1920×1080 演示文稿 — 支持视频、PDF 或交互式 HTML。

[English](README_en.md)
[更新记录](CHANGELOG.md)
[Node.js](https://nodejs.org/)
[License: MIT](LICENSE)
[Version](_meta.json)

传入飞书文档、Markdown 文件或任意 URL，Pipeline 会使用 MiniMax LLM 分析内容，自动选择 **13 种设计主题**，渲染像素级精确的 HTML 幻灯片，并按你选择的格式打包输出 — 全程自动化。

**[查看示例输出 →](examples/demo-output/)** 在浏览器中打开 `presentation.html` 查看实际效果。

---

## 功能特性

- **3 种输入源** — 飞书文档、本地 `.md`/`.txt` 文件、网页
- **3 种输出格式** — MP4 视频（含 TTS 配音）、PDF、交互式 HTML 幻灯片
- **13 种设计主题** — 7 个深色 + 6 个浅色，根据内容关键词自动匹配
- **20+ 内容变体** — 面板、数据网格、时间线、卡片网格、图标矩阵、图表、表格、引言、代码块及混合布局
- **布局提示** — 同一变体不同视觉排列（`grid-3`、`cards`、`hero-1`、`horizontal`、…）
- **自适应排版** — 字号、栅格列数、内容密度自动适应文字长度
- **8 个独立步骤** — 运行完整流程或单独重跑任意步骤；所有中间产物持久化到磁盘
- **大纲 + 逐字稿** — 每次导出都附带 `outline.md` 和 `script.md`

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

# 4. 打开结果
open ./output/presentation.html
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

## 13 种设计主题

`design_mode` 为空时按下面顺序自动解析，也可在每次调用的 JSON 里**手动指定**合法主题 id。

**未在当次 JSON 里传 `design_mode` 时**（优先级由高到低）：

1. `project.json` 中 Step0 写入的 **`recommended_design_mode`**（模型返回对象且 id 合法）。  
2. `project.json` 中的 **`design_mode`**（且不等于默认 `electric-studio`）。  
3. 正文与标题关键词规则（`inferContentType` + `CONTENT_TYPE_MAP`），例如人文 / 社科 / 策展等 → **`dark-botanical`**。

**当次 JSON 里显式传入的 `design_mode`** 始终最高优先级。

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

## 内容变体

LLM 自动为每张幻灯片选择最佳变体：


| 变体               | 模板                  | 触发条件         |
| ---------------- | ------------------- | ------------ |
| `text`           | `01_text_only`      | 段落正文         |
| `panel`          | `02_panel`          | 关键点列表        |
| `stats_grid`     | `03_stats_grid`     | 数据指标         |
| `number`         | `04_number`         | 大数字指标        |
| `quote`          | `05_quote`          | 引言           |
| `timeline`       | `07_timeline`       | 步骤流程         |
| `two_col`        | `08_two_col`        | 双栏对比         |
| `icon_grid`      | `10_icon_grid`      | emoji 图标网格   |
| `code`           | `11_code_block`     | 代码块          |
| `table`          | `12_table`          | 表格数据         |
| `card_grid`      | `13_card_grid`      | 卡片网格         |
| `nav_bar`        | `14_nav_bar`        | 章节导航         |
| `chart`          | `15_chart_demo`     | CSS 柱状图      |
| `panel_stat`     | `16_panel_stat`     | 混合：列表 + 指标   |
| `number_bullets` | `17_number_bullets` | 混合：数字 + 编号条目 |
| `quote_context`  | `18_quote_context`  | 混合：引言 + 背景   |
| `text_icons`     | `19_text_icons`     | 混合：正文 + 图标   |


每个变体支持**布局提示**（如 `grid-3`、`cards`、`hero-1`、`horizontal`、`2x2`），在不更换模板的情况下改变视觉排列。

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
├── presentation.html      # 交互式幻灯片（format=html）
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
├── _meta.json                      # Agent 集成 schema（v3.0.1）
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
├── samples/                        # 设计主题模板
│   ├── electric-studio/            # 13 个主题目录，每个含完整变体集
│   ├── bold-signal/
│   ├── ...
│   └── shared/                     # 主题无关变体（stats、timeline 等）
├── examples/
│   ├── test_article.md             # 测试用示例文章
│   ├── tencent_intro_light.md    # 长文企业介绍示例（如 swiss-modern）
│   ├── full_variant_test.md        # 全变体覆盖测试
│   └── scenes_example.json         # 手动 scenes.json 参考
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