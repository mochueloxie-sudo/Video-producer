---

name: SlideForge
description: >
  把飞书文档、本地文件（.md/.txt）或网页一键转换为高品质演示内容。
  支持视频/PDF/交互式HTML三种交付格式，13种设计主题、22种内容变体（含对照/流程/架构栈/漏斗等），
  可选页内入场与 stagger 动效，8个独立Step自由组合。
type: agent
version: "3.1.0"
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
      description: 执行哪个步骤（可独立调用）
    source:
      type: string
      description: 飞书文档 URL、本地文件路径（.md/.txt）或网页 URL（Step 0 使用）
    scenes:
      type: string
      description: scenes.json 文件路径（Step 1-6 输入）
    design_params:
      type: string
      description: design_params.json 文件路径（Step 3 / Step 4 输入）
    design_mode:
      type: string
      description: 设计主题 id。留空则根据内容自动选择。与 designMode 等价。
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
    designMode:
      type: string
      description: 同 design_mode（executor 别名，驼峰）
    format:
      description: 交付格式（Step 6 / command all）。单字符串或字符串数组，多选时同时生成多种产物。默认 video。
      default: "video"
      oneOf:
        - type: string
          enum: ["video", "pdf", "html"]
        - type: array
          minItems: 1
          items:
            type: string
            enum: ["video", "pdf", "html"]
    channel:
      type: string
      description: 交付渠道。默认 local（打包到 output_dir）。
      enum: ["local", "feishu"]
      default: "local"
    output_dir:
      type: string
      default: "./output"
      description: 输出目录（所有 Step 共用）
    projectDir:
      type: string
      description: 同 output_dir（executor 别名，驼峰）
    html_dir:
      type: string
      description: HTML 目录（Step 4 截图输入）
    screenshots_dir:
      type: string
      description: 截图目录（Step 6 视频/PDF 输入）
    audio_dir:
      type: string
      description: 音频目录（Step 6 视频合成输入）
    output:
      type: string
      description: 视频输出路径（Step 6 format=video）
    video_path:
      type: string
      description: 本地视频文件路径（Step 7 channel=feishu 上传用）
    doc_title:
      type: string
      description: 飞书文档标题（Step 7 channel=feishu）
    folder_token:
      type: string
      description: 飞书目标文件夹 token（Step 7 channel=feishu）
    source_url:
      type: string
      description: 原文链接（附在交付文件末尾，可选）
    voice:
      type: string
      description: Edge TTS 语音名称（Step 5，默认 zh-CN-XiaoxiaoNeural）
    language:
      type: string
      description: 内容语言（Step 0/5，默认 zh-CN）
    page_animations:
      type: boolean
      default: true
      description: 是否启用页内入场动效（Step 2 写入 design_params；Step 3 HTML 注入；Step 4 有动画时等待就绪再截图）。传 false 关闭。
    page_animation_preset:
      type: string
      enum: ["none", "fade", "stagger"]
      default: "stagger"
      description: 页内动效预设。none=无；fade=整页淡入；stagger=块级交错（需 page_animations 非 false）。
  required: ["command"]
output:
  type: object
  properties:
    success: {type: boolean}
    step: {type: string}
    outputs: {type: array, items: {type: string}}
    message: {type: string}
    metadata: {type: object}

## executor: executor.js

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

| Step | 名称       | 核心工具                                                       | 输入                     | 输出                         |
| ---- | -------- | ---------------------------------------------------------- | ---------------------- | -------------------------- |
| 0    | 内容分析     | MiniMax LLM                                                | source URL/文件          | `scenes.json`              |
| 1    | 逐字稿      | MiniMax LLM                                                | `scenes.json`          | `scenes[].script`          |
| 2    | 设计参数     | 本地 preset +（可选）入参 `design_mode` / Step0 `recommended` / 规则 | `scenes.json`          | `design_params.json`       |
| 3    | HTML 渲染  | html_generator                                             | scenes + design_params | `html/page_XXX.html`       |
| 4    | 截图       | Puppeteer                                                  | html/ 目录               | `screenshots/page_XXX.png` |
| 5    | TTS 合成   | edge-tts / say                                             | scenes (script)        | `audio/page_XXX.mp3`       |
| 6    | **交付格式** | FFmpeg / PDF / HTML                                        | screenshots + audio    | 视频/PDF/HTML + 大纲 + 逐字稿     |
| 7    | **交付渠道** | 本地/飞书                                                      | Step 6 产出              | 打包文件 / 飞书文档                |

---

## 交付格式（Step 6）


| 格式      | 产出文件                           | 依赖                            |
| ------- | ------------------------------ | ----------------------------- |
| `video` | `presentation.mp4`             | FFmpeg（`brew install ffmpeg`） |
| `pdf`   | `presentation.pdf`             | 无额外依赖                         |
| `html`  | `presentation.html`（主入口：iframe 单页，hover + 入场动画）+ `presentation_static.html`（PNG 轮播）+ 同目录 `page_*.html` | 无额外依赖 |


**无论选择哪种格式，都自动附带：**

- `outline.md` — 内容大纲（标题、页码、关键词）
- `script.md` — 完整逐字稿（按页分段）

---

## 交付渠道（Step 7）


| 渠道          | 行为                          | 前置条件                                             |
| ----------- | --------------------------- | ------------------------------------------------ |
| `local`（默认） | 所有产出文件打包在 output_dir，输出文件清单 | 无                                                |
| `feishu`    | 创建飞书文档 + 嵌入视频/附件 + 写入大纲和逐字稿 | `FEISHU_APP_ID` + `FEISHU_APP_SECRET` + lark-cli |


---

## 13 种设计主题

### 深色主题


| 主题                  | 背景色      | 强调色     | 适用场景      |
| ------------------- | -------- | ------- | --------- |
| `electric-studio`   | 深蓝黑      | 蓝紫 + 天蓝 | 通用兜底      |
| `bold-signal`       | 深灰       | 橙红      | 商业/品牌/营销  |
| `creative-voltage`  | 深蓝       | 电蓝      | 创意/设计/艺术  |
| `dark-botanical`    | 深棕       | 暖金      | 人文/教育/社科  |
| `neon-cyber`        | 极深黑      | 霓虹青 + 紫 | 科幻/数字/AI  |
| `terminal-green`    | GitHub暗色 | 绿 + 蓝   | 技术/代码/API |
| `deep-tech-keynote` | 深蓝       | 天蓝 + 蓝紫 | 深度技术演讲    |


### 浅色主题


| 主题                  | 背景色 | 强调色    | 适用场景     |
| ------------------- | --- | ------ | -------- |
| `swiss-modern`      | 白底  | 纯黑     | 极简/瑞士风   |
| `paper-ink`         | 米白  | 红黑     | 印刷/出版/编辑 |
| `vintage-editorial` | 暖白  | 棕金     | 复古/文艺    |
| `notebook-tabs`     | 深暖灰 | 薄荷绿    | 笔记/手账    |
| `pastel-geometry`   | 粉白  | 粉+几何色块 | 轻快/活泼    |
| `split-pastel`      | 粉白  | 柔粉+蓝   | 温柔/女性化   |


**未指定 `design_mode` 时**（JSON 里不写该字段）：先用 `project.json` 里 Step0 写入的 `recommended_design_mode`，再不行则用 Step2 内容关键词规则。  
**指定 `design_mode` 时**：必须为本技能枚举中的 **合法 id 字符串**（如 `terminal-green`），流水线会固定使用该主题。

---

## Agent：用户模糊描述 → `design_mode`（无需改代码）

当用户在对话里用自然语言说「想要什么样的感觉」时，**由 Agent 在本技能内查表、选唯一主题 id**，并在调用 `executor.js` 的 JSON 里写入 `design_mode`。底层只认 id，不理解自然语言。

### 操作原则

1. **先读上表「13 种设计主题」**：每个 `design_mode` 一行，含深浅、气质、场景；从中选 **最贴近用户原话 + 文档类型** 的一条。
2. **用户明确说「自动 / 你看着办 / 跟内容走」**：**不要**传 `design_mode`，交给推荐与规则。
3. **用户只说「深色」或「浅色」**：在对应池里再按内容二选一（技术→`terminal-green`，商务→`bold-signal`，清新活泼→浅色里选 `pastel-geometry` 等）。
4. **用户描述与内容冲突**（例如技术文档但用户要「粉嫩」）：以用户风格为准并简短说明取舍；极端不合理时可建议确认仍坚持再写入。

### 口语 → 候选主题（映射参考，非穷尽）


| 用户常说法                | 可考虑的 `design_mode`（按语境择一）                                           |
| -------------------- | ------------------------------------------------------------------- |
| 深色、暗色、夜里用、酷、赛博、科技感强  | `neon-cyber`、`electric-studio`、`deep-tech-keynote`、`terminal-green` |
| 高级、稳重、发布会、Keynote、大场 | `deep-tech-keynote`、`electric-studio`、`bold-signal`                 |
| 商务、增长、营销、亮眼          | `bold-signal`、`electric-studio`                                     |
| 清新、活泼、轻松、年轻、马卡龙      | `pastel-geometry`、`split-pastel`                                    |
| 极简、干净、瑞士、专业白纸黑字      | `swiss-modern`、`paper-ink`                                          |
| 文艺、复古、纸质感、编辑部        | `vintage-editorial`、`paper-ink`                                     |
| 笔记、手账、学习记录           | `notebook-tabs`                                                     |
| 人文、博物馆、疗愈、暖金暗底       | `dark-botanical`                                                    |
| 代码、开发者、终端、GitHub 感   | `terminal-green`                                                    |
| 创意、设计提案、电量感          | `creative-voltage`                                                  |
| 浅色、明亮、汇报给老板但不花哨      | `swiss-modern`、`paper-ink`                                          |
| 女性向、柔和、温柔            | `split-pastel`                                                      |


### 调用示例（Agent 填好 `design_mode` 后）

```bash
echo '{"command":"all","source":"./article.md","format":"html","output_dir":"./output","design_mode":"deep-tech-keynote"}' | node executor.js
```

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


| 变体                     | 用途       | 每页信息容量              |
| ---------------------- | -------- | ------------------- |
| `panel` + grid-3/cards | 要点列表     | 3-6 × (标题+正文描述)     |
| `card_grid`            | 卡片网格     | 3-6 × (图标/编号+标题+正文) |
| `icon_grid`            | 图标矩阵     | 4-9 × (emoji+标签+描述) |
| `stats_grid`           | 数据指标     | 2-4 × (数字+标签+说明)    |
| `timeline`             | 时间线/流程   | 3-5 × (步骤标题+描述)     |
| `two_col`              | 双栏对比     | 左栏段落 + 右栏要点         |
| `number`               | 大数字      | 1个核心指标              |
| `quote`                | 引言       | 引语+来源               |
| `text`                 | 纯文本      | 段落正文                |
| `code`                 | 代码展示     | 代码块+说明              |
| `table`                | 表格       | 多行多列数据              |
| `chart`                | 图表       | CSS柱状图              |
| `nav_bar`              | 导航页      | 章节切换                |
| `panel_stat`           | 混合：列表+数据 | 要点+1个大指标            |
| `number_bullets`       | 混合：数字+说明 | 大数字+编号条目            |
| `quote_context`        | 混合：引言+背景 | 引语+归因+上下文           |
| `text_icons`           | 混合：文本+图标 | 段落+图标网格             |


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

