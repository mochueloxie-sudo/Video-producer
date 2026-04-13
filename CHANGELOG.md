# Changelog

面向使用者的版本记录；架构与长期路线见 `[CLAUDE.md](CLAUDE.md)` **备忘与 Roadmap** → **（二）已明确的 Roadmap**。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [Unreleased]

> 当前迭代工作区：在此记下进行中项，发版时剪切到带日期的版本节。

### 进行中

- （暂无）

### 候选（从 Roadmap 挑选）

- （从 Roadmap 挑选下一项）
- **交付 HTML**：`presentation.html` 键盘说明写入 README / 首次打开轻提示（可选）。

### 待定

- `**npm audit`（`basic-ftp`）**：结论、风险判断与后续动作以 **`CLAUDE.md`**「备忘与 Roadmap」→「（一）开发者记录」→「已知限制」第 2 条为准；此处仅作占位。

---

## [3.1.2] — 2026-04-13

### 页内动画与截图

- **`design_params.page_animations`** / **`page_animation_preset`**（`none` / `fade` / `stagger`）：`utils/page_animations.js` 注入样式与就绪标记；`html_generator` 在统计卡、时间线、要点、图表等块上输出 `data-vp-animate` 与 stagger；`{{KEY_POINT}}` / `{{BODY}}` 行重复与图例行同样注入。
- **Step4**：将 `design_params` 传给 `screenshot.js`，开启动画时等待 `data-vp-anim-ready` 再截图。
- **交互 hover（克制）**：`shared` 变体 + `panel` / `icon_grid` / `card_grid`；仅用 outline / background / box-shadow，避免与入场 `transform` 冲突；`@media (hover:hover) and (pointer:fine)`。

### HTML 交付与本地预览

- **`presentation.html`**：iframe 单页主入口（翻页重播入场 + 组件 hover）；**`presentation_static.html`**：PNG 轮播（与 PDF 画面一致）。
- **`step6_format.js`**：`presentation.html` 增加分发说明注释；终端提示勿用 `file://` 打开 iframe 目录，并给出 **`npm run preview:html -- <output_dir>`**；壳内轻提示对齐。
- **`utils/preview_server.js`**：本地静态 HTTP 预览（默认端口 8765）；`package.json` 脚本 **`preview:html`**。

### 主题与 `html_generator`

- **`notebook-tabs`**：对仅存在于 `samples/shared/` 的变体，经 **`samples/notebook-tabs/_content_shell.html`** 将 shared 整页嵌入主题纸面 / tabs 壳（`loadTemplateWithSource` + `mergeNotebookTabsSharedIntoShell`），避免 shared 页脱离笔记本视觉。

### Step0 / Step1 与 LLM

- 新增 **`steps/utils/minimax_utils.js`**：OpenAI Chat Completions 兼容 HTTP、**L3** 系统约束、**L1** 围栏剥离与括号配平抽取、**L2** HTTP 退避、解析失败整段重请求；Step0 / Step1 统一 `require` 该模块。
- **环境变量**：**`MINIMAX_*` 优先**（建议 MiniMax），否则 **`LLM_*`**；二者皆缺时错误信息指向两处；**`getLlmConfig()`** 导出供日志与诊断。
- **`llm_client.js`**：与 `minimax_utils` 对齐的配置读取；**`.env.example` / README / README_en / SKILL** 同步说明。
- **`package-lock.json`**：与当前 `dependencies` 对齐（已移除未使用的 `@anthropic-ai/sdk` 树）。

### Agent、文档与元数据

- **`SKILL.md`**：依赖清单、失败对照、执行话术等整理（无 YAML frontmatter；宿主说明见 **`_meta.json`** 附录）。
- **`CLAUDE.md`**：`refs/` 之后改为 **（一）开发者记录** / **（二）已明确的 Roadmap** 双轨；借鉴各 § 标注 Roadmap 映射；**§5** 与 **P1**、`steps/step_import.js` 对齐；**P1** 增补 Step0–2 与 Agent 产出 **`scenes.json`** 方向。
- **`README.md` / `README_en.md`**：与上述 LLM 策略、交付说明、`CLAUDE` 中 P2 引用路径一致。
- **`refs/STYLE_PRESETS.md`**：与当前主题参考一致的小幅修订。

### 示例与工程卫生

- **`npm run demo:html-local`**：`examples/scenes_example.json` 跑 step2→3→4→6（仅 `html`），不依赖 Step0 LLM。
- 示例分镜 **`examples/verify_notebook_shell_scenes.json`**：用于验证 `notebook-tabs` + shared 壳与动效。
- **`.gitignore`**：忽略 **`verify_notebook_shell/`** 等本地验证输出目录。

---

## [3.1.1] — 2026-04-12

### 视频合成

- `**steps/animations/animation-strategies.js`**：去掉各策略中的 `**fade=in`**。每页单独编码后再 `**concat**` 时，片头 `fade=in` 会从黑场拉起，表现为 封面黑屏 与 翻页黑幕。保留 zoompan / hue / crop / boxblur 等不引入全透明起手的滤镜；`professional` 改为 `**setsar=1**`。
- `**steps/step6_video.js**`：`-vf` 插入在所有输入之后、`-c:v` 之前，避免 FFmpeg 参数顺序错误。

### HTML 渲染

- `**utils/html_generator.js**`：`content_variant` `**summary**` 映射到 `**02_panel**`，避免误落 `01_text_only` 导致 `key_points` 不渲染。
- `**nav_bar**`：`subtitle` / `secondary` / `body` 皆空时，用 `**script**` 写入 `**SUBTITLE**`（模板正文区为 `{{SUBTITLE}}` 而非 `{{BODY}}`）。

### Agent 与文档

- `**executor.js**`：支持 `**node executor.js ./request.json**`，便于 OpenClaw 等禁止 shell 管道的环境。
- `**SKILL.md**` / `**README.md**` / `**README_en.md**`：触发技能前建议向用户确认 `format` / `channel`；说明 `**presentation.html`（iframe + `page_*.html`）** 与 `**presentation_static.html`（PNG 单文件轮播）** 的差异，避免误称「交互式」。

---

## [3.1.0] — 2026-04-11

### 内容变体（四款 · 全主题可用）

- `**compare`**（`samples/shared/20_compare.html`）：双列对照 / Before·After / 优劣列表；字段 `compare_left_title`、`compare_right_title`、`compare_left_points[]`、`compare_right_points[]`，可选 `compare_center_label`（如 `VS`、`→`）。布局提示：`equal`  `wide-left`  `wide-right`。
- `**process_flow`**（`21_process_flow.html`）：叙事型流程——横向阶段条（`process_stages[]`）或泳道（`flow_lanes[]` + `cells[]`）。布局提示：`horizontal`  `swimlane`。显式 `content_variant: process_flow` 时可用 `steps[]` 降级映射为横向 rail。
- `**architecture_stack**`（`22_architecture_stack.html`）：系统分层 / 架构栈，`layers[{ title, desc }]`。层数 ≥5 时 Step2 可给 `layout_hint: compact`。
- `**funnel**`（`23_funnel.html`）：转化漏斗 3～5 层，`funnel_stages[{ label, desc }]`；可选 `compact` 高密度。

### 流水线

- **Step0**：`steps/step0_analyze.js` 补充上述变体的选用说明、容量表与 JSON schema。
- **Step2**：`steps/step2_design.js` 在 hybrid 之后、chart 之前识别四类场景；`computeLayoutHint` 覆盖 `compare` / `process_flow` / `architecture_stack` / `funnel`。
- **HTML**：`utils/html_generator.js` 注册 `variantMap`、预渲染 token、`inferVariant` 字段推断、缺数据时降级为 `panel`；`process_flow` 默认 `layout-horizontal`。

### 示例与文档

- 示例分镜：`examples/four_new_variants_scenes.json`（四变体 + 封面/过渡/收尾，便于 step2→3 目检）。
- 中英 README 变体表与特性描述已同步；`CLAUDE.md` 中 `shared/` 样张列表已更新。
- `**npm pack` / `npm publish`**：`package.json` 增加 `**files` 白名单**， tarball 含 `**SKILL.md`**、`**_meta.json`**、`executor.js`、`steps/`、`samples/`、`examples/`、`refs/` 等运行与 Agent 接入所需路径；不再打入 `demo_html_out`、`preview_*`、`test_*` 试跑目录、`.claude`、仓库内 `docs/` 草稿等。`.gitignore` 补充常见试跑目录，避免误提交。

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