# GitHub Release 草稿（v3.1.2）

## Release 标题

```
v3.1.2 — 页内动画、MiniMax/LLM 统一客户端、notebook-tabs 壳与本地 HTML 预览
```

## Release 正文（Markdown）

```markdown
### 动效与截图

- 页内入场与 **`page_animation_preset`**（`none` / `fade` / `stagger`）；块级 **`data-vp-animate`**；Step4 等待 **`data-vp-anim-ready`** 再截图。
- 克制 **hover**（不与入场 `transform` 冲突）。

### HTML 与预览

- **`presentation.html`**（iframe + 动效 / hover）与 **`presentation_static.html`**（PNG 轮播）；**勿用 `file://`** 打开 iframe 目录。
- **`npm run preview:html -- <output_dir>`** + **`utils/preview_server.js`**。

### 主题与 LLM

- **`notebook-tabs`**：`shared` 变体经 **`_content_shell.html`** 包进笔记本纸面 / tabs。
- 新增 **`steps/utils/minimax_utils.js`**：**`MINIMAX_*` 优先**，否则 **`LLM_*`**；Step0 / Step1 统一经此调用。

### 文档

- **`SKILL.md` / README**：依赖与接入说明；**`CLAUDE.md`**：`refs/` 后 **开发者记录** 与 **Roadmap（P0/P1/P2）** 分轨；P1 含 **`step_import`** 与 Agent **`scenes.json`** 方向。

**完整记录**：[CHANGELOG.md](https://github.com/mochueloxie-sudo/SlideForge/blob/main/CHANGELOG.md)
```
