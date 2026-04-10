# Changelog

面向使用者的版本记录；架构与长期路线见 [`CLAUDE.md`](CLAUDE.md) 中的 **Roadmap**。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [Unreleased]

> 当前迭代工作区：在此记下进行中项，发版时剪切到带日期的版本节。

### 进行中

- （在此填写本迭代正在做的条目）

### 工程与文档（近期）

- `package-lock.json` 与 `package.json` 对齐，移除已不在依赖中的 `@anthropic-ai/sdk` 树；`llm_client.js` 仅为 MiniMax HTTPS 封装。
- 新增 `refs/README.md`，`CLAUDE.md` 设计参考与主题选择章节与仓库现状一致并修正 Markdown。

### 候选（从 Roadmap 挑选）

- **P0 阶段 1**：块级 `data-vp-animate` / stagger；`page_animation_preset` 多档预设（样张 + `html_generator`）。
- **交付 HTML**：`presentation.html` 键盘说明写入 README / 首次打开轻提示（可选）。

### 待定

- **`npm audit`**：传递依赖 `basic-ftp` 报 high（FTP CRLF / 命令注入类，[GHSA-chqc-8p9q-pq6q](https://github.com/advisories/GHSA-chqc-8p9q-pq6q)）。对本仓库典型用法（本地/CI 跑流水线、非对外 FTP 服务）风险极低；后续可 `npm audit fix` 并跑 `npm run test:e2e` 再发版。

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
