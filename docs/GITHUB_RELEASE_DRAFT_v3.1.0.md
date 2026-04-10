# GitHub Release 草稿（v3.1.0）

发版时在 GitHub → Releases → Draft 中粘贴下列标题与正文；与 `CHANGELOG.md` **[3.1.0]** 节一致。

## Release title

```
v3.1.0 — Four narrative variants (compare, process flow, architecture stack, funnel)
```

## Release notes（正文）

```markdown
### Highlights

- **Four new content variants** (all **13 themes** via `samples/shared/` + design tokens):
  - **`compare`** — dual-column contrast / Before·After (`20_compare.html`)
  - **`process_flow`** — horizontal stage rail or swimlanes (`21_process_flow.html`)
  - **`architecture_stack`** — layered system context (`22_architecture_stack.html`)
  - **`funnel`** — conversion tiers (`23_funnel.html`)
- **Pipeline**: Step0 schema & guidance, Step2 detection + `layout_hint`, `html_generator` `variantMap` + tokens + safe fallbacks to `panel`.
- **Example deck**: `examples/four_new_variants_scenes.json` for step2→3 visual check.

### Packaging

- **`SKILL.md`** and **`_meta.json`** are included in the npm tarball (`package.json` → `files`) for Cursor, Codex, OpenClaw, and other agent runtimes.

### Upgrade notes

- No breaking changes to CLI or `executor.js` JSON shape; existing `scenes.json` remain valid.
- New slides appear when Step0 chooses the new variants or when scenes include the new fields documented in README / CHANGELOG.

**Full changelog**: see [CHANGELOG.md](https://github.com/mochueloxie-sudo/slide-forge/blob/main/CHANGELOG.md).
```

## npm（若发 npm 包）

```bash
npm version 3.1.0 --no-git-tag-version   # 若版本已在 package.json 则跳过
npm publish                              # 需已登录 npm 且仓库配置正确
```
