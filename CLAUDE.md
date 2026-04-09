# CLAUDE.md — slide-forge 内部开发指南

## 项目概述

把飞书文档、本地文件或网页一键转为 1920×1080 演示内容。
三种交付格式（视频 / PDF / 交互式 HTML），13 种主题自动匹配，所有产出附大纲和逐字稿。

**核心原则**：工具链固化 + 创意自由解放
- 底层工具固化：Puppeteer 截图、FFmpeg 合成、Edge TTS
- 设计层解放：HTML 渲染完全由样张 token 驱动

---

## 架构

| 层 | 文件 | 职责 |
|----|------|------|
| 入口 | `executor.js` | 路由命令到各 Step，`run_all` 串联全流程 |
| 核心渲染 | `utils/html_generator.js` | 加载样张 → 替换 token → 注入 CSS → 写出 HTML |
| 截图 | `utils/screenshot.js` | Puppeteer 批量截图 1920×1080 |
| 样张 | `samples/{theme}/` | 13 主题 × 15+ 变体，纯 HTML + CSS |
| Step 0 | `steps/step0_analyze.js` | MiniMax LLM 分析内容 → scenes.json |
| Step 1 | `steps/step1_script.js` | MiniMax LLM 生成逐字稿 |
| Step 2 | `steps/step2_design.js` | 规则引擎：主题选择 + 变体推断 + layout_hint |
| Step 3 | `steps/step3_html.js` | 调用 html_generator |
| Step 4 | `steps/step4_screenshot.js` | 调用 screenshot.js |
| Step 5 | `steps/step5_tts.js` | edge-tts（降级 macOS say） |
| Step 6 | `steps/step6_format.js` | 交付格式：video / pdf / html + outline + script |
| Step 7 | `steps/step7_channel.js` | 交付渠道：local / feishu |
| 内部 | `steps/step6_video.js` | FFmpeg H.264+AAC 25fps（被 step6_format 调用） |
| 内部 | `steps/step7_publish.js` | lark-cli 飞书发布（被 step7_channel 调用） |
| 工具 | `steps/utils/content_extractor.js` | 多源内容提取（飞书 / 本地 / 网页） |
| 工具 | `steps/utils/llm_client.js` | MiniMax HTTP 封装 |
| 工具 | `steps/utils/tool-locator.js` | ffmpeg / ffprobe / imagemagick 自动发现 |

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

`shared/` 通用变体（主题无关）：
- `03_stats_grid.html` / `07_timeline.html` / `08_two_col.html`
- `16_panel_stat.html` / `17_number_bullets.html` / `18_quote_context.html` / `19_text_icons.html`

### Token 规范

- 全大写 `{{NAME}}`，repeat marker 无下标（`{{KEY_POINT}}`），命名 slot 用 `{{NAME_0}}`
- 自适应 token 示例：`{{KP_FONT_SIZE}}`、`{{ICON_GRID_COLS}}`、`{{TABLE_FONT_SIZE}}`

### Layout Hint 机制

`layout_hint` 注入到 `<body class="layout-xxx">`，模板内任何元素通过 `body.layout-xxx .selector {}` 响应：

| 变体 | 可用 hint |
|------|----------|
| `panel` | `stack`（默认）/ `grid-3` / `sidebar-left` / `cards` / `numbered` |
| `stats_grid` | `row`（默认）/ `hero-1` / `2x2` |
| `timeline` | `vertical`（默认）/ `horizontal` / `alternating` |
| `two_col` | `equal`（默认）/ `wide-left` / `wide-right` |
| `quote` | `center`（默认）/ `left-bar` / `full` |
| `number` | `center`（默认）/ `split` |
| `card_grid` | 默认 / `2x2` |
| `icon_grid` | 自动（按数量推断列数） |

---

## html_generator.js 核心逻辑

入口：`generateHtml(scenes, designMode, htmlDir, pageDirections)`

```
1. scene.type → generateCover / generateContent / generateSummary
2. generateContent：按 content_variant 加载样张
3. 扫描 {{TOKEN}} markers → 替换
4. repeat marker → 按数组长度重复对应 HTML 片段
5. 注入全局 CSS：readability + density + glass + title + centering
6. 写出 page_XXX.html
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

## 注意事项

- **样张 > 代码**：样式决策以样张 HTML 为准，不在 generator 里硬编码 CSS
- **固定 1920×1080**：样张用 px，不用 rem/vw
- **Generator 只做管道**：读取样张 → 替换 token → 写出
- **scene.body / scene.secondary 可能是 string 或 string[]**：访问前做 `Array.isArray` 判断
- **副标题 fallback 链**：`scene.subtitle || scene.secondary || scene.body?.[0] || ''`
- **系统 Chrome 降级**：screenshot.js 和 step6_format.js 在 Puppeteer 找不到 bundled Chrome 时 fallback 到 `/Applications/Google Chrome.app`

### 已知限制

1. FFmpeg 需用户手动安装（`brew install ffmpeg`）
2. `steps/utils/llm_client.js` 顶部残留 `require('@anthropic-ai/sdk')`（未使用，待清理）

---

## 待优化点

### dark-botanical 主题未被 CONTENT_TYPE_MAP 覆盖（P2）
- **问题**：13 个主题中 `dark-botanical` 没有出现在 `CONTENT_TYPE_MAP` 里，`inferContentType()` 也没有相关关键词，永远不会被 auto-select 命中
- **现状**：`dark-botanical` 只能通过用户手动 `--design_mode dark-botanical` 指定
- **待确认**：为 `dark-botanical` 补充对应的内容类型和关键词映射（如"人文/教育/社科" → `dark-botanical`）

### graphic-design executor 引用问题（P1）
- **问题**：`steps/step2_design.js` 引用了 `~/.openclaw/workspace/skills/graphic-design/executor.js`，但该 skill 不存在于 workspace/skills/ 目录中
- **现状**：调用时 30 秒超时后 fallback 到本地 preset，功能可用但有延迟
- **待确认**：这个引用为什么会保留？是否可以移除或改为纯可选逻辑（不做强制调用）？
- **参考路径**：`step2_design.js` 第 3 行注释 `// 默认真实调用 graphic-design executor；失败时回退到本地 preset`

### Step 0 LLM 语义推荐设计主题（P1）
- **现状**：Step 0 只做内容结构化，不推荐主题；主题选择由 Step 2 的 `inferContentType()` 规则引擎完成
- **目标**：在 Step 0 的 LLM prompt 中增加主题推荐逻辑，让 AI 直接根据内容语义输出 `design_mode` 建议，存入 scenes.json
- **优势**：Step 0 已调用 LLM，增加主题推荐无需额外 API 调用；语义理解比规则匹配更准确
- **实现思路**：在 Step 0 prompt 末尾追加一行要求 LLM 输出 `recommended_design_mode`（从 13 个主题中选择最匹配的）

---

## Roadmap

### P0 — HTML 动画支持

当前截图是静态 1920×1080 PNG，交互式 HTML 演示也是图片轮播。下一步让 HTML 页面本身具备动画能力：

- **目标**：每张幻灯片支持入场动画（fade-in、slide-up、stagger reveal 等），`format=html` 时直接播放动画，`format=video` 时用 Puppeteer 录制动画帧
- **参考**：[frontend.slides](https://github.com/nicolo-ribaudo/frontend-slides) 的 CSS Animation + Intersection Observer 方案
- **实现思路**：
  1. `samples/` 样张中为每个元素添加 `data-animate="fade-up"` 属性和对应 CSS `@keyframes`
  2. 新增 `steps/animations/` 动画策略配置（已有 `animation-strategies.js` 骨架）
  3. Step 3 渲染时根据 `design_params.animation` 注入动画 CSS + JS trigger
  4. Step 4 截图模式不变（等动画完成后截静态帧）；Step 6 `format=video` 模式用 `page.screencast()` 或逐帧 `page.screenshot()` 录制动画
  5. Step 6 `format=html` 演示模式直接保留原始 HTML（而非截图），切页时触发动画

### P1 — 样张丰富度 + 用户自定义主题

当前 13 主题 + 20+ 变体覆盖了大部分场景，但用户可能有自己的品牌风格：

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
