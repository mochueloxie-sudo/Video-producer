# GitHub Release 草稿（v3.1.0 · 中文）

与 `CHANGELOG.md` **[3.1.0]** 节一致。已用于线上 Release 正文时可仅作归档参考。

## Release 标题

```
v3.1.0 — 四款叙事变体（对照、流程、架构栈、漏斗）
```

## Release 正文（Markdown）

```markdown
### 亮点

- **四种新内容变体**（`samples/shared/` + 设计 token，**全部 13 套主题**可用）：
  - **`compare`** — 双列对照 / Before·After（`20_compare.html`）
  - **`process_flow`** — 横向阶段条或泳道（`21_process_flow.html`）
  - **`architecture_stack`** — 分层架构 / 系统栈（`22_architecture_stack.html`）
  - **`funnel`** — 转化漏斗（`23_funnel.html`）
- **流水线**：Step0 补充 schema 与选用说明；Step2 识别四类场景并设置 `layout_hint`；`html_generator` 注册 `variantMap`、token 与缺数据时向 `panel` 的安全降级。
- **示例分镜**：`examples/four_new_variants_scenes.json`，便于 step2→step3 目检。
- **Agent 接入**：`SKILL.md` 与 `_meta.json` 已纳入 npm 包（`package.json` → `files`），含 `format`（字符串或数组）、`page_animations`、`page_animation_preset` 等与执行器一致的字段说明。

### 升级说明

- **无破坏性变更**：CLI 与 `executor.js` JSON 形态保持兼容，既有 `scenes.json` 仍可直接使用。
- 当 Step0 选用新变体，或场景数据中包含 README / CHANGELOG 所述新字段时，会生成对应新版式。

**完整变更记录**：[CHANGELOG.md](https://github.com/mochueloxie-sudo/SlideForge/blob/main/CHANGELOG.md)
```

## npm（若发 npm 包）

```bash
npm version 3.1.0 --no-git-tag-version   # 若版本已在 package.json 则跳过
npm publish                              # 需已登录 npm 且仓库配置正确
```
