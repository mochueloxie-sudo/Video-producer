# CLAUDE.md — slide-forge 内部开发指南

## 项目概述

把飞书文档、本地文件或网页一键转为 1920×1080 演示内容。
三种交付格式（视频 / PDF / 交互式 HTML），13 种主题自动匹配，所有产出附大纲和逐字稿。

**核心原则**：工具链固化 + 创意自由解放

- 底层工具固化：Puppeteer 截图、FFmpeg 合成、Edge TTS
- 设计层解放：HTML 渲染完全由样张 token 驱动

---

## 架构


| 层      | 文件                                 | 职责                                                                                                              |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 入口     | `executor.js`                      | 路由命令到各 Step，`run_all` 串联全流程                                                                                     |
| 核心渲染   | `utils/html_generator.js`          | 加载样张 → 替换 token → 注入 CSS → 写出 HTML                                                                              |
| 页内动画   | `utils/page_animations.js`         | P0：`design_params.page_animations` 时注入整页入场 CSS + 启动脚本（与 FFmpeg 的 `steps/animations/animation-strategies.js` 分离） |
| 截图     | `utils/screenshot.js`              | Puppeteer 批量截图 1920×1080                                                                                        |
| 样张     | `samples/{theme}/` + `samples/shared/` | 13 主题；每主题一组样张 + `shared/` 通用变体（含 compare / process_flow / architecture_stack / funnel），纯 HTML + CSS |
| Step 0 | `steps/step0_analyze.js`           | MiniMax LLM 分析内容 → scenes.json                                                                                  |
| Step 1 | `steps/step1_script.js`            | MiniMax LLM 生成逐字稿                                                                                               |
| Step 2 | `steps/step2_design.js`            | 规则引擎：主题选择 + 变体推断 + layout_hint                                                                                  |
| Step 3 | `steps/step3_html.js`              | 调用 html_generator                                                                                               |
| Step 4 | `steps/step4_screenshot.js`        | 调用 screenshot.js                                                                                                |
| Step 5 | `steps/step5_tts.js`               | edge-tts（降级 macOS say）                                                                                          |
| Step 6 | `steps/step6_format.js`            | 交付格式：video / pdf / html + outline + script                                                                      |
| Step 7 | `steps/step7_channel.js`           | 交付渠道：local / feishu                                                                                             |
| 内部     | `steps/step6_video.js`             | FFmpeg H.264+AAC 25fps（被 step6_format 调用）                                                                       |
| 内部     | `steps/step7_publish.js`           | lark-cli 飞书发布（被 step7_channel 调用）                                                                               |
| 工具     | `steps/utils/content_extractor.js` | 多源内容提取（飞书 / 本地 / 网页）                                                                                            |
| 工具     | `steps/utils/llm_client.js`        | MiniMax HTTP 封装                                                                                                 |
| 工具     | `steps/utils/tool-locator.js`      | ffmpeg / ffprobe / imagemagick 自动发现                                                                             |


---

## 样张系统

### 主题（13 个）

**深色**：`electric-studio`、`bold-signal`、`creative-voltage`、`dark-botanical`、`neon-cyber`、`terminal-green`、`deep-tech-keynote`

**浅色**：`notebook-tabs`、`paper-ink`、`pastel-geometry`、`split-pastel`、`swiss-modern`、`vintage-editorial`

### 变体文件

每个主题目录包含：

- `cover.html`
- `01_text_only.html` / `02_panel.html` / `04_number.html` / `05_quote.html`
- `10_icon_grid.html` / `11_code_block.html` / `12_table.html`
- `13_card_grid.html` / `14_nav_bar.html` / `15_chart_demo.html`

`shared/` 通用变体（主题无关，**全主题经 `loadTemplate` 回退共用**）：

- `03_stats_grid.html` / `07_timeline.html` / `08_two_col.html`
- `16_panel_stat.html` / `17_number_bullets.html` / `18_quote_context.html` / `19_text_icons.html`
- `20_compare.html` / `21_process_flow.html` / `22_architecture_stack.html` / `23_funnel.html`

### Token 规范

- 全大写 `{{NAME}}`，repeat marker 无下标（`{{KEY_POINT}}`），命名 slot 用 `{{NAME_0}}`
- 自适应 token 示例：`{{KP_FONT_SIZE}}`、`{{ICON_GRID_COLS}}`、`{{TABLE_FONT_SIZE}}`

### Layout Hint 机制

`layout_hint` 注入到 `<body class="layout-xxx">`，模板内任何元素通过 `body.layout-xxx .selector {}` 响应：


| 变体           | 可用 hint                                                       |
| ------------ | ------------------------------------------------------------- |
| `panel`      | `stack`（默认）/ `grid-3` / `sidebar-left` / `cards` / `numbered` |
| `stats_grid` | `row`（默认）/ `hero-1` / `2x2`                                   |
| `timeline`   | `vertical`（默认）/ `horizontal` / `alternating`                  |
| `two_col`    | `equal`（默认）/ `wide-left` / `wide-right`                       |
| `quote`      | `center`（默认）/ `left-bar` / `full`                             |
| `number`     | `center`（默认）/ `split`                                         |
| `card_grid`  | 默认 / `2x2`                                                    |
| `icon_grid`  | 自动（按数量推断列数）                                                   |
| `compare`    | `equal`（默认）/ `wide-left` / `wide-right`                         |
| `process_flow` | `horizontal`（默认，阶段条）/ `swimlane`（需 `flow_lanes[]`）          |
| `architecture_stack` | 默认 / `compact`（层数多）                                  |
| `funnel`     | 默认 / `compact`（层数多）                                        |


---

## html_generator.js 核心逻辑

入口：`generateHtml(scenes, designMode, htmlDir, designParams)`  
第四参为 Step2 产出的完整 `design_params`（含 `page_directions`、`page_animations` 等）；兼容旧调用传入 **仅** `page_directions` 数组。

```
1. scene.type → generateCover / generateContent / generateSummary
2. generateContent：按 content_variant 加载样张
3. 扫描 {{TOKEN}} markers → 替换
4. repeat marker → 按数组长度重复对应 HTML 片段（`{{KEY_POINT}}` / `{{BODY}}` 行在 stagger 预设下对首标签注入 `data-vp-animate`）
5. 注入全局 CSS：readability + density + glass + title + centering
6. 若 `page_animations !== false` 且预设非 `none`：再注入页内动画（见 `page_animations.js`）
7. 写出 page_XXX.html
```

关键函数：

- `loadTemplate(theme, variant)` — 先找主题目录，fallback 到 shared/
- `buildTokens(scene, total)` — 构建 token map
- `replaceTokens(html, tokens)` — `{{NAME}}` → 值
- `getReadabilityCSS()` — 全局最小字号基线
- `getDensityCSS()` — 内容密度自适应
- `getGlassEnhancementCSS(tpl)` — 毛玻璃 / 液体效果
- `getTitleEnhancementCSS(pageType)` — 标题字号增强

### CSS 注入顺序

每个页面的 `</head>` 前注入：

1. `readCSS` — 可读性基线
2. `densityCSS` — 密度自适应
3. `glassCSS` — 毛玻璃效果
4. `titleCSS` — 标题增强
5. 居中 CSS — flexbox 垂直居中
6. （可选）`#vp-page-animations` — 整页 `fade-up` 入场 + `body` 启动类（`page_animations` 开启时）

---

## step2_design.js 核心逻辑

- `inferContentVariant(scene)` — 按字段优先级推断变体
- `computeLayoutHint(scene)` — 按条目数选择 layout hint
- `autoSelectDesignMode(scenes)` — 关键词打分选主题
- `computeDensity(scene)` — 内容密度分类（sparse / normal / rich）
- 节奏纠正 — 连续相同 layout_hint 自动交替

---

## 常见开发任务

### 添加新 Token

```js
// utils/html_generator.js 对应变体块：
tokens.MY_TOKEN = escapeHtml(scene.my_field || '');
// 样张中：{{MY_TOKEN}}
```

### 新增页面变体

1. 在 `samples/{theme}/` 或 `samples/shared/` 创建样张
2. 在 `variantMap` 中添加映射
3. 在 `step2_design.js` 的 `inferContentVariant()` 中添加推断分支
4. 在 `step0_analyze.js` 的 LLM prompt 中添加变体 schema

### 调试 HTML 生成

```bash
echo '{"command":"step3","design_params":"./output/design_params.json","scenes":"./output/scenes.json","output_dir":"./debug"}' | node executor.js
grep -o '{{[A-Z_]*}}' ./debug/page_*.html   # 应为空
open ./debug/page_002.html
```

### 全流程测试

```bash
echo '{"command":"all","source":"./examples/full_variant_test.md","format":["pdf","html"],"output_dir":"./test_e2e"}' | node executor.js
open ./test_e2e/presentation.html
```

---

## 设计原则参考（`refs/`）

视觉与动效参考材料见 **[refs/README.md](refs/README.md)**（当前仓库内含 `STYLE_PRESETS.md`、`viewport-base.css`、`animation-patterns.md`）。完整 [frontend-slides](https://github.com/zarazhangrui/frontend-slides) 树为**可选本地 clone**，默认不 vendored。动画范式另可参考 [frontend.slides](https://github.com/nicolo-ribaudo/frontend-slides)（与 FFmpeg 滤镜策略勿混用，见下文 Roadmap）。

---

## 注意事项

- **样张 > 代码**：样式决策以样张 HTML 为准，不在 generator 里硬编码 CSS
- **固定 1920×1080**：样张用 px，不用 rem/vw
- **Generator 只做管道**：读取样张 → 替换 token → 写出
- **scene.body / scene.secondary 可能是 string 或 string[]**：访问前做 `Array.isArray` 判断
- **副标题 fallback 链**：`scene.subtitle || scene.secondary || scene.body?.[0] || ''`
- **系统 Chrome 降级**：screenshot.js 和 step6_format.js 在 Puppeteer 找不到 bundled Chrome 时 fallback 到 `/Applications/Google Chrome.app`

### 已知限制

1. FFmpeg 需用户手动安装（`brew install ffmpeg`）
2. **依赖审计（待定）**：`npm audit` 可能报传递依赖 `**basic-ftp`** [High — GHSA-chqc-8p9q-pq6q](https://github.com/advisories/GHSA-chqc-8p9q-pq6q)（FTP 相关 CRLF / 命令注入类）。本仓库典型用法是本地或 CI 跑流水线、**不**以「对不可信 FTP 服务端发起客户端连接」为核心能力，**实际风险极低**。若需清零告警或满足合规，再执行 `npm audit fix` 并跑 `npm run test:e2e` 验证 Puppeteer 链路。发版时可将结论摘要抄入 `CHANGELOG.md` 对应版本节。

---

## 主题选择链路（与当前代码一致）

实现见 `steps/step2_design.js`。**未**在当次 JSON 传入 `design_mode` 时，优先级为：

1. `project.json` 的 `recommended_design_mode`（Step0 LLM 对象响应写入；须为 13 个合法主题 id 之一）→ `mode_source: step0-llm`
2. `project.json` 的 `design_mode`（且不等于默认 `electric-studio`）→ `mode_source: project.json`
3. `inferContentType()` + `CONTENT_TYPE_MAP` 内容规则兜底 → `mode_source: auto`

当次 JSON 里显式传入的 `design_mode` 始终最高优先级（`mode_source: user`）。

Step0：`scenes.json` 仍为**纯 scenes 数组**；`project.json` 可含 `recommended_design_mode`。若模型只返回数组（无推荐字段），Step2 走规则自动选主题。

**dark-botanical**：已映射内容类型 **人文社科**（中/英键），`inferContentType()` 含人文/社科/策展/心理学等关键词时命中；与 **文化艺术** → **vintage-editorial** 并列分流。

**Step2 preset 来源**：仅 `steps/presets/frontend-presets.json`（`getFallbackPreset`）与专业模式的 `getDeepTechKeynotePreset`；**不再**调用 OpenClaw 的 `graphic-design` executor（历史上曾硬编码 `~/.openclaw/.../executor.js` 并导致 30s 超时）。若将来再接外部设计 agent，建议用**显式环境变量**（例如仅当 `GRAPHIC_DESIGN_EXECUTOR` 指向可读脚本时才 `spawn`），默认关闭。

---

## Roadmap

### P0 — HTML 动画支持

当前截图是静态 1920×1080 PNG，交互式 HTML 演示也是图片轮播。下一步让 HTML 页面本身具备动画能力；`format=html` 时直接播放动画，`format=video` 长期可用 Puppeteer 录制动效帧。

**参考**：[frontend.slides](https://github.com/nicolo-ribaudo/frontend-slides) 的 CSS Animation +（后续）Intersection Observer。

**分阶段（执行顺序）**


| 阶段    | 内容                                                                                                                                                    | 状态               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **0** | `design_params.page_animations`（Step2 默认 `true`）+ `utils/page_animations.js` 注入 CSS + boot 脚本；`screenshot.js` 在开启动画时等待 `data-vp-anim-ready` | **已落地**         |
| **1** | `html_generator` 为列表/卡片/时间线等块加 `data-vp-animate` + 行内 stagger；`page_animation_preset`: `none` / `fade` / `stagger`；Step3 传入完整 `design_params` | **已落地**         |
| **2** | `format=video`：Puppeteer 录制动效帧；与 `presentation.html`（iframe 单页）动效策略对齐                                                                                | 待做               |


**与现有文件分工**

- `**utils/page_animations.js`**：单页 HTML 的 CSS + 极短启动脚本（P0）。
- `**steps/animations/animation-strategies.js`**：FFmpeg 滤镜策略；语义与页内 CSS 动画分离，勿混用。

**后续实现思路（阶段 1+）**

1. 在重点变体样张或 `html_generator` 内联块上增加 `data-vp-animate` + stagger delay
2. Step3 按 `page_animation_preset` 选择 CSS 包
3. Step4 / Step6：无动画分支保持短延迟；有动画分支已等待关键帧后再截图（视频路径后续扩展 `screencast` 或逐帧）

### P1 — 样张丰富度 + 用户自定义主题

当前 13 主题 + **22** 个 `content_variant`（含 `shared/` 四款叙事变体）覆盖大部分场景，但用户可能有自己的品牌风格：

- **持续拓展内置样张**：
  - 新增行业垂直主题（医疗、教育、金融等）
  - 新增变体类型（对比图、流程图、组织架构、漏斗图等）
  - 定期从优秀 PPT 模板中提取新样张
- **用户自定义主题（通用方案）**：
  1. **上传 PPT / 图片 → 自动提取样张**：用户上传自己喜欢的 PPT 或设计截图，系统自动分析版式结构（标题位置、配色、字体、布局模式），生成对应的 HTML 样张 + token 映射
  2. **实现路径**：
    - 新增 `steps/step_import.js`：接收 `.pptx` / `.pdf` / `.png` 输入
    - PPT 路径：用 `pptx-parser` 解析母版 → 提取色板、字体、版式 → 生成 `samples/custom-{name}/` 目录
    - 图片路径：用 LLM Vision 分析截图布局 → 推断 HTML 结构 + CSS → 生成样张
    - 输出标准的 `cover.html` + 变体文件，自动注册到 `DESIGN_TEMPLATES`
  3. **简化方案（先行）**：提供 `samples/_template/` 脚手架目录，用户只需填色值和字体即可快速创建新主题

