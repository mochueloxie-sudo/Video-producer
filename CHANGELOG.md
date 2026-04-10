# Changelog

面向使用者的版本记录；架构与长期路线见 [`CLAUDE.md`](CLAUDE.md) 中的 **Roadmap**。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [Unreleased]

> 当前迭代工作区：在此记下进行中项，发版时剪切到带日期的版本节。

### 进行中

- **P0 阶段 1（页内动画）**：`design_params.page_animations` / `page_animation_preset`（`none` \| `fade` \| `stagger`）；`utils/page_animations.js` 注入样式与就绪标记；`html_generator` 在统计卡、时间线、要点、图表等块上输出 `data-vp-animate` 与 stagger 延迟；`{{KEY_POINT}}` / `{{BODY}}` 行重复与图例行同样注入；Step4 将 `design_params` 传给 `screenshot.js`，有动画时等待 `data-vp-anim-ready` 再截图。
- **`npm run demo:html-local`**：用 `examples/scenes_example.json` 跑 step2→3→4→6（仅 `html` 交付），不依赖 Step0 LLM。
- **`presentation.html` 主入口**：iframe 加载各 `page_XXX.html`（翻页重播入场动画 + 组件 hover）；**`presentation_static.html`** 为 PNG 截图轮播（与 PDF 画面一致，无组件 hover）。
- **交互 hover（克制）**：`shared` 变体 + `panel` / `icon_grid` / `card_grid` 注入样式；**仅用 outline / background / box-shadow**，避免与 `[data-vp-animate]` 入场动画的 `transform` 冲突（否则 hover 几乎不生效）。仅 `@media (hover:hover) and (pointer:fine)`。

### 工程与文档（近期）

- `package-lock.json` 与 `package.json` 对齐，移除已不在依赖中的 `@anthropic-ai/sdk` 树；`llm_client.js` 仅为 MiniMax HTTPS 封装。
- 新增 `refs/README.md`，`CLAUDE.md` 设计参考与主题选择章节与仓库现状一致并修正 Markdown。

### 候选（从 Roadmap 挑选）

- （从 Roadmap 挑选下一项）
- **交付 HTML**：`presentation.html` 键盘说明写入 README / 首次打开轻提示（可选）。

### 待定

- **`npm audit`（`basic-ftp`）**：结论、风险判断与后续动作以 **`CLAUDE.md` → 注意事项 → 已知限制 → 第 2 条** 为准；此处仅作发版备忘占位，避免与 CLAUDE 重复长文。

---

## [3.1.0] — 2026-04-11

### 内容变体（四款 · 全主题可用）

- **`compare`**（`samples/shared/20_compare.html`）：双列对照 / Before·After / 优劣列表；字段 `compare_left_title`、`compare_right_title`、`compare_left_points[]`、`compare_right_points[]`，可选 `compare_center_label`（如 `VS`、`→`）。布局提示：`equal` \| `wide-left` \| `wide-right`。
- **`process_flow`**（`21_process_flow.html`）：叙事型流程——横向阶段条（`process_stages[]`）或泳道（`flow_lanes[]` + `cells[]`）。布局提示：`horizontal` \| `swimlane`。显式 `content_variant: process_flow` 时可用 `steps[]` 降级映射为横向 rail。
- **`architecture_stack`**（`22_architecture_stack.html`）：系统分层 / 架构栈，`layers[{ title, desc }]`。层数 ≥5 时 Step2 可给 `layout_hint: compact`。
- **`funnel`**（`23_funnel.html`）：转化漏斗 3～5 层，`funnel_stages[{ label, desc }]`；可选 `compact` 高密度。

### 流水线

- **Step0**：`steps/step0_analyze.js` 补充上述变体的选用说明、容量表与 JSON schema。
- **Step2**：`steps/step2_design.js` 在 hybrid 之后、chart 之前识别四类场景；`computeLayoutHint` 覆盖 `compare` / `process_flow` / `architecture_stack` / `funnel`。
- **HTML**：`utils/html_generator.js` 注册 `variantMap`、预渲染 token、`inferVariant` 字段推断、缺数据时降级为 `panel`；`process_flow` 默认 `layout-horizontal`。

### 示例与文档

- 示例分镜：`examples/four_new_variants_scenes.json`（四变体 + 封面/过渡/收尾，便于 step2→3 目检）。
- 中英 README 变体表与特性描述已同步；`CLAUDE.md` 中 `shared/` 样张列表已更新。
- **`npm pack` / `npm publish`**：`package.json` 增加 **`files` 白名单**， tarball 含 **`SKILL.md`**、**`_meta.json`**、`executor.js`、`steps/`、`samples/`、`examples/`、`refs/` 等运行与 Agent 接入所需路径；不再打入 `demo_html_out`、`preview_*`、`test_*` 试跑目录、`.claude`、仓库内 `docs/` 草稿等。`.gitignore` 补充常见试跑目录，避免误提交。

---

## [3.0.1] — 2026-04-10

### 交互式网页（`presentation.html`）

- 翻页按钮缩小，中性毛玻璃样式，在浅色 / 深色幻灯片上更易辨认。
- 「逐字稿」按钮：面板打开时隐藏，关闭面板后恢复；短逐字稿时抽屉排版更紧凑。
- 键盘：方向键与空格翻页，`S` 开关逐字稿，`Esc` 关闭。

### 主题与流水线

- Step0 可写 `recommended_design_mode`；Step2 与文档对齐：显式参数 → 推荐 → `project.json` 保存值 → 关键词规则（含 `dark-botanical` / 人文社科）。
- Step2 设计参数统一走本地 `frontend-presets.json`（移除历史 graphic-design 外部调用路径）。

### 文档与仓库

- 中英 README：修正 clone 地址、主题解析顺序、示例 `tencent_intro_light.md`。
- `.gitignore`：忽略常见本地试跑输出目录。

---

## [3.0.0] — 2026-04-09

- SlideForge 品牌化与 v3 能力基线（13 主题、多格式、8 Step 等）。详见仓库 tag `v3.0.0` 及对应 Release。
