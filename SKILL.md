---
name: SlideForge
description: >
  把飞书文档、本地文件（.md/.txt）或网页链接一键转换为高品质 1920×1080 演示内容。
  支持三种交付格式（视频/PDF/交互式HTML），13种设计主题自动匹配，
  所有产出自动附带大纲和逐字稿。8个独立Step，支持任意节点重跑。
type: agent
version: "3.0.0"
metadata:
  clawdbot:
    emoji: "🎬"
    os: ["linux", "darwin", "win32"]
input:
  type: object
  properties:
    command:
      type: string
      enum: ["step0", "step1", "step2", "step3", "step4", "step5", "step6", "step7", "all"]
      description: 执行哪个步骤（每个 Step 可独立调用）
    source:
      type: string
      description: 飞书文档 URL、本地文件路径（.md/.txt）或网页 URL（Step 0 使用）
    format:
      type: string
      enum: ["video", "pdf", "html"]
      default: "video"
      description: "交付格式（Step 6）。video=MP4视频，pdf=PDF文档，html=交互式网页演示"
    channel:
      type: string
      enum: ["local", "feishu"]
      default: "local"
      description: "交付渠道（Step 7）。local=打包到本地，feishu=发布到飞书文档"
    design_mode:
      type: string
      description: "设计主题。留空则根据内容自动选择。"
      enum:
        - electric-studio
        - bold-signal
        - creative-voltage
        - dark-botanical
        - neon-cyber
        - terminal-green
        - deep-tech-keynote
        - notebook-tabs
        - paper-ink
        - pastel-geometry
        - split-pastel
        - swiss-modern
        - vintage-editorial
    output_dir:
      type: string
      default: "./output"
      description: 输出目录（所有 Step 共用）
  required: ["command"]
output:
  type: object
  properties:
    success: {type: boolean}
    step: {type: string}
    outputs: {type: array, items: {type: string}}
    message: {type: string}
    metadata: {type: object}
executor: executor.js
---

## 快速开始

### 一键生成（最常用）

```bash
echo '{"command":"all","source":"./article.md","format":"video","output_dir":"./output"}' | node executor.js
```

### 生成 PDF 演示

```bash
echo '{"command":"all","source":"./article.md","format":"pdf","output_dir":"./output"}' | node executor.js
```

### 生成交互式 HTML 幻灯片

```bash
echo '{"command":"all","source":"./article.md","format":"html","output_dir":"./output"}' | node executor.js
```

---

## Pipeline 总览

| Step | 名称 | 核心工具 | 输入 | 输出 |
|------|------|---------|------|------|
| 0 | 内容分析 | MiniMax LLM | source URL/文件 | `scenes.json` |
| 1 | 逐字稿 | MiniMax LLM | `scenes.json` | `scenes[].script` |
| 2 | 设计参数 | 预设查表 | `scenes.json` | `design_params.json` |
| 3 | HTML 渲染 | html_generator | scenes + design_params | `html/page_XXX.html` |
| 4 | 截图 | Puppeteer | html/ 目录 | `screenshots/page_XXX.png` |
| 5 | TTS 合成 | edge-tts / say | scenes (script) | `audio/page_XXX.mp3` |
| 6 | **交付格式** | FFmpeg / PDF / HTML | screenshots + audio | 视频/PDF/HTML + 大纲 + 逐字稿 |
| 7 | **交付渠道** | 本地/飞书 | Step 6 产出 | 打包文件 / 飞书文档 |

---

## 交付格式（Step 6）

| 格式 | 产出文件 | 依赖 |
|------|---------|------|
| `video` | `presentation.mp4` | FFmpeg（`brew install ffmpeg`） |
| `pdf` | `presentation.pdf` | 无额外依赖 |
| `html` | `presentation.html`（单文件，可直接打开） | 无额外依赖 |

**无论选择哪种格式，都自动附带：**
- `outline.md` — 内容大纲（标题、页码、关键词）
- `script.md` — 完整逐字稿（按页分段）

---

## 交付渠道（Step 7）

| 渠道 | 行为 | 前置条件 |
|------|------|---------|
| `local`（默认） | 所有产出文件打包在 output_dir，输出文件清单 | 无 |
| `feishu` | 创建飞书文档 + 嵌入视频/附件 + 写入大纲和逐字稿 | `FEISHU_APP_ID` + `FEISHU_APP_SECRET` + lark-cli |

---

## 13 种设计主题

### 深色主题

| 主题 | 背景色 | 强调色 | 适用场景 |
|------|--------|--------|---------|
| `electric-studio` | 深蓝黑 | 蓝紫 + 天蓝 | 通用兜底 |
| `bold-signal` | 深灰 | 橙红 | 商业/品牌/营销 |
| `creative-voltage` | 深蓝 | 电蓝 | 创意/设计/艺术 |
| `dark-botanical` | 深棕 | 暖金 | 人文/教育/社科 |
| `neon-cyber` | 极深黑 | 霓虹青 + 紫 | 科幻/数字/AI |
| `terminal-green` | GitHub暗色 | 绿 + 蓝 | 技术/代码/API |
| `deep-tech-keynote` | 深蓝 | 天蓝 + 蓝紫 | 深度技术演讲 |

### 浅色主题

| 主题 | 背景色 | 强调色 | 适用场景 |
|------|--------|--------|---------|
| `swiss-modern` | 白底 | 纯黑 | 极简/瑞士风 |
| `paper-ink` | 米白 | 红黑 | 印刷/出版/编辑 |
| `vintage-editorial` | 暖白 | 棕金 | 复古/文艺 |
| `notebook-tabs` | 深暖灰 | 薄荷绿 | 笔记/手账 |
| `pastel-geometry` | 粉白 | 粉+几何色块 | 轻快/活泼 |
| `split-pastel` | 粉白 | 柔粉+蓝 | 温柔/女性化 |

未指定 `design_mode` 时，Step 2 根据内容关键词自动选择最匹配的主题。

---

## 环境变量

```ini
# 必填：MiniMax LLM（Step 0 内容分析 + Step 1 逐字稿）
MINIMAX_API_KEY=sk-...
MINIMAX_MODEL=MiniMax-M2.7-highspeed
MINIMAX_BASE_URL=https://api.minimax.chat/v1

# format=video 时必填
# brew install ffmpeg

# channel=feishu 时必填
FEISHU_APP_ID=cli_...
FEISHU_APP_SECRET=...

# TTS（Step 5）
# pip install edge-tts
```

---

## 内容变体（20+种）

Step 0 LLM 根据内容自动选择最佳变体：

| 变体 | 用途 | 每页信息容量 |
|------|------|-------------|
| `panel` + grid-3/cards | 要点列表 | 3-6 × (标题+正文描述) |
| `card_grid` | 卡片网格 | 3-6 × (图标/编号+标题+正文) |
| `icon_grid` | 图标矩阵 | 4-9 × (emoji+标签+描述) |
| `stats_grid` | 数据指标 | 2-4 × (数字+标签+说明) |
| `timeline` | 时间线/流程 | 3-5 × (步骤标题+描述) |
| `two_col` | 双栏对比 | 左栏段落 + 右栏要点 |
| `number` | 大数字 | 1个核心指标 |
| `quote` | 引言 | 引语+来源 |
| `text` | 纯文本 | 段落正文 |
| `code` | 代码展示 | 代码块+说明 |
| `table` | 表格 | 多行多列数据 |
| `chart` | 图表 | CSS柱状图 |
| `nav_bar` | 导航页 | 章节切换 |
| `panel_stat` | 混合：列表+数据 | 要点+1个大指标 |
| `number_bullets` | 混合：数字+说明 | 大数字+编号条目 |
| `quote_context` | 混合：引言+背景 | 引语+归因+上下文 |
| `text_icons` | 混合：文本+图标 | 段落+图标网格 |

---

## 单步调用示例

```bash
P=./project

# Step 0: 分析内容
echo '{"command":"step0","source":"./article.md","output_dir":"'"$P"'"}' | node executor.js

# Step 1: 生成逐字稿
echo '{"command":"step1","scenes":"'"$P"'/scenes.json","output_dir":"'"$P"'"}' | node executor.js

# Step 2: 设计参数（可指定主题或自动）
echo '{"command":"step2","scenes":"'"$P"'/scenes.json","output_dir":"'"$P"'","design_mode":"terminal-green"}' | node executor.js

# Step 3: 渲染 HTML
echo '{"command":"step3","scenes":"'"$P"'/scenes.json","design_params":"'"$P"'/design_params.json","output_dir":"'"$P"'/html"}' | node executor.js

# Step 4: 截图
echo '{"command":"step4","html_dir":"'"$P"'/html","output_dir":"'"$P"'/screenshots"}' | node executor.js

# Step 5: TTS
echo '{"command":"step5","scenes":"'"$P"'/scenes.json","output_dir":"'"$P"'/audio"}' | node executor.js

# Step 6: 交付格式（视频+PDF+HTML 三种都要）
echo '{"command":"step6","format":["video","pdf","html"],"scenes":"'"$P"'/scenes.json","screenshots_dir":"'"$P"'/screenshots","audio_dir":"'"$P"'/audio","output_dir":"'"$P"'"}' | node executor.js

# Step 7: 交付渠道（本地打包）
echo '{"command":"step7","channel":"local","output_dir":"'"$P"'"}' | node executor.js
```

---

## 开发规范

- **样张 > 代码**：样式决策以 `samples/` HTML 为准
- **固定像素**：样张用 px（截图 1920×1080）
- **Generator 职责**：读取样张 → 替换 token → 写出
- **Token 命名**：`{{NAME}}` 全大写，repeat marker 无下标
