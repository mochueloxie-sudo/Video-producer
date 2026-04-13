# SlideForge

从飞书文档 URL、本地 `.md`/`.txt` 或网页 URL 生成 **1920×1080** 演示（`video` / `pdf` / `html`），并附带大纲与逐字稿。仓库根目录执行 `node executor.js`，向 **stdin** 传入一行 JSON；无管道时可用 `node executor.js /path/to/request.json`。样张、token、各 Step 实现见 [CLAUDE.md](CLAUDE.md)。

---

## 最小执行（command 为 all）

**入口**：`node executor.js`，stdin 一行 JSON（与 `request.json` 内容相同）。

**与 LLM / 子进程**：`command: "all"` 在独立 Node 进程里**固定**跑 Step0 → Step1，经 HTTP 调用**环境变量里配置好的 LLM**，与当前对话里的大模型**不是同一条调用链**。见 `**.env.example`** 与下文「厂商与变量名」。若已由对话侧生成合规 `**scenes.json**`（可参考 `**examples/scenes_example.json**`），可从 `**step2**` 起依次调用至 `**step7**`；当前实现**不会**让 `all` 跳过 Step0/1。

### Agent 读到 LLM 依赖时（建议）

- **先问用户**：运行 `executor.js` 的机器上是否已配置 `**.env`**，且接受跑 **Step0/1**（从零 `source` 时必跑）。
- **话术顺序**：**建议优先准备 MiniMax**（填 `**MINIMAX_*`**，与仓库默认、官方文档一致）。**若没有 MiniMax key**，再让用户填 `**LLM_*`**（任意 OpenAI Chat Completions 兼容端点的 URL / key / model）。
- **若 Step0/1 报错**：看 stderr；核对 `**MINIMAX_*` 或 `LLM_*`**、网络、模型名、Base URL（通常需含 `/v1`）。仍失败可走 `**scenes.json` + step2**。

### 厂商与变量名（重要）

- **代码读取顺序**：`**MINIMAX_*` 优先**；未设置时再读 `**LLM_*`**（便于「建议 MiniMax、没有再用别家」）。二者同时填写时以 `**MINIMAX_***` 为准。实现见 `**steps/utils/minimax_utils.js**`。
- **协议**：OpenAI **Chat Completions** 兼容（`POST {BASE}/chat/completions`）。无 MiniMax 时，把兼容网关的 **URL（含 `/v1`）/ key / model** 写入 `**LLM_*`**。
- **未逐一认证**所有非 MiniMax 网关；若响应格式不一致，需改代码或走 `scenes.json`。


| 字段                      | 在 `all` 中   | 说明                                                                |
| ----------------------- | ----------- | ----------------------------------------------------------------- |
| `command`               | **必填**      | 全流程用 `"all"`                                                      |
| `source`                | **通常必填**    | 飞书 URL、本地路径、或网页 URL                                               |
| `format`                | **强烈建议显式写** | `"pdf"` / `"html"` / `"video"` 或数组。默认偏 `video`：**未与用户确认前不要省略成视频** |
| `output_dir`            | 可选          | 默认 `./output`                                                     |
| `channel`               | 可选          | `local`（默认）或 `feishu`                                             |
| `design_mode`           | 可选          | 合法值为下文 **13 主题 id**；省略则 Step0 推荐 + Step2 规则                       |
| `page_animations`       | 可选          | 默认 `true`；`false` 关闭页内入场动效                                        |
| `page_animation_preset` | 可选          | `none`、`fade`、`stagger`（默认 `stagger`）                             |


**别名**：`designMode` 同 `design_mode`，`projectDir` 同 `output_dir`。

### 常用一行命令

```bash
echo '{"command":"all","source":"./article.md","format":"video","output_dir":"./output"}' | node executor.js
```

```bash
echo '{"command":"all","source":"./article.md","format":"pdf","output_dir":"./output"}' | node executor.js
```

```bash
echo '{"command":"all","source":"./article.md","format":"html","output_dir":"./output"}' | node executor.js
```

```bash
node executor.js ./request.json
```

---

## 跑前与用户确认（推荐）

调用前宜与用户确认再写入 JSON。**不要**在未确认时默认 `format: "video"`（耗时长，依赖 FFmpeg、TTS）。

1. **内容来源** — 飞书、本地 `.md`/`.txt`、网页 URL？（`source`）
2. **交付格式** — PDF / HTML / 视频 / 多选？（`format`）；含 **video** 需本机 **FFmpeg**、**edge-tts**（或 macOS `**say`**）
3. **交付渠道** — 本地或飞书？（`channel`）；**feishu** 需 `.env` 凭证及 `**doc_title`**、`**folder_token**` 等
4. **（可选）** — `**design_mode`**、`**output_dir**`、`**page_animations: false**`？
5. **从零生成** — 是否已按 `**.env.example`** 配好 Step0/1（**建议 `MINIMAX_*`**；没有则用 `**LLM_***`）及飞书读文档所需项？
6. **依赖** — 对照下文「依赖准备清单」

---

## 依赖不足时会发生什么（实现现状）

- **无**统一预检；缺依赖在对应 Step 失败（非 0 退出、stderr 有说明）。**首次**跑 `executor.js` 前应对照「依赖准备清单」。
- **常见失败**：Step0/1 未设 `**MINIMAX_API_KEY` 或 `LLM_API_KEY`**（及对应 BASE/Model）或 URL/模型不兼容；`format` 含 **video** 时 Step5 无 edge-tts 且无 macOS `say` → `未找到可用的 TTS 工具…`；Step6 缺 **ffmpeg/ffprobe** → `Required tools (ffmpeg/ffprobe) not available`；飞书缺凭证或 lark-cli → Step0 读文档或 Step7 失败。

---

## 依赖准备清单（建议在跑命令前完成）


| 场景                           | 用户需提前具备                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `command: "all"` 且带 `source` | `**.env`**：**建议 `MINIMAX_*`**；若无 MiniMax 再填 `**LLM_***`（见 `**.env.example**`）；`source` 为飞书时还要飞书应用凭证   |
| `format` 含 `video`           | `**ffmpeg` + `ffprobe**`；TTS：`**pip install edge-tts**`（或 `python3 -m edge_tts`），或 macOS `**say**` 降级 |
| 仅 `pdf` 和/或 `html`           | **Node** + `**npm install`**（含 Puppeteer）；Step4 需能启动浏览器                                               |
| `channel: "feishu"`          | `**.env.example**` 飞书项、**lark-cli**、JSON 里 `**doc_title` / `folder_token`** 等                         |


### 可选自检命令

```bash
node -v
ffmpeg -version && ffprobe -version
(command -v edge-tts >/dev/null 2>&1 && edge-tts --version) || python3 -m edge_tts --version
```

macOS 可补充：`which say`。

---

## 交付格式（Step 6）


| `format` | 主要产出                                                                 | 依赖     |
| -------- | -------------------------------------------------------------------- | ------ |
| `video`  | `presentation.mp4`                                                   | FFmpeg |
| `pdf`    | `presentation.pdf`                                                   | 无额外依赖  |
| `html`   | `presentation.html` + `presentation_static.html` + 同目录 `page_*.html` | 无额外依赖  |


### format=html：两入口对照（交付前必读）


| 文件                             | 单文件能独立打开？       | 与谁同目录                                            |
| ------------------------------ | --------------- | ------------------------------------------------ |
| `**presentation.html**`        | **否**（iframe 壳） | **必须**与全部 `page_001.html` … `page_NNN.html` 一并分发 |
| `**presentation_static.html`** | **是**（内嵌 PNG）   | 无                                                |


- 交 `**presentation.html`**：至少该文件 + 全部 `**page_*.html**`（建议整个 `output_dir`）。
- 单文件分享：用 `**presentation_static.html**` 或 **PDF**，并说明为静帧轮播。

目录里通常还有 `**outline.md`**、`**script.md**`。

---

## Pipeline 总览


| Step | 名称   | 输入 → 输出（摘要）                                             |
| ---- | ---- | ------------------------------------------------------- |
| 0    | 内容分析 | `source` → `scenes.json`                                |
| 1    | 逐字稿  | `scenes.json` → 写入 `script`                             |
| 2    | 设计参数 | `scenes.json` + 可选 `design_mode` → `design_params.json` |
| 3    | HTML | scenes + `design_params` → `html/page_*.html`           |
| 4    | 截图   | `html_dir` → `screenshots/page_*.png`                   |
| 5    | TTS  | scenes（script）→ `audio/page_*.mp3`                      |
| 6    | 交付格式 | 截图 + 音频等 → video/pdf/html + 大纲 + 逐字稿                    |
| 7    | 交付渠道 | Step6 产出 → 本地或飞书                                        |


---

## 交付渠道（Step 7）


| `channel`   | 行为               | 前置                                             |
| ----------- | ---------------- | ---------------------------------------------- |
| `local`（默认） | 产物在 `output_dir` | 无                                              |
| `feishu`    | 飞书文档 + 附件等       | `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、lark-cli 等 |


---

## 分步调用时的额外字段

`command` 为 `step0`…`step7` 时按需附加（路径均为字符串）：


| 字段                                      | 典型用于                      |
| --------------------------------------- | ------------------------- |
| `scenes`                                | step1–6                   |
| `design_params`                         | step3、step4               |
| `html_dir`                              | step4                     |
| `screenshots_dir`、`audio_dir`           | step6                     |
| `output`                                | step6 自定义视频路径（可选）         |
| `video_path`、`doc_title`、`folder_token` | step7 `feishu`            |
| `voice`、`language`                      | step0/5（见 `.env.example`） |
| `source_url`                            | 可选                        |


---

## 13 种设计主题

### 深色


| `design_mode`       | 气质 / 场景（摘要）  |
| ------------------- | ------------ |
| `electric-studio`   | 深蓝黑，通用兜底     |
| `bold-signal`       | 商业 / 品牌 / 营销 |
| `creative-voltage`  | 创意 / 设计      |
| `dark-botanical`    | 人文 / 教育      |
| `neon-cyber`        | 科幻 / 数字 / AI |
| `terminal-green`    | 技术 / 代码      |
| `deep-tech-keynote` | 深度技术演讲       |


### 浅色


| `design_mode`       | 气质 / 场景（摘要） |
| ------------------- | ----------- |
| `swiss-modern`      | 极简 / 瑞士     |
| `paper-ink`         | 印刷 / 编辑     |
| `vintage-editorial` | 复古 / 文艺     |
| `notebook-tabs`     | 笔记 / 手账     |
| `pastel-geometry`   | 轻快 / 活泼     |
| `split-pastel`      | 柔和 / 温柔     |


**规则**：`design_mode` 须为表中 id；用户要「自动」则**不传**该字段。未传时：Step0 推荐 id → Step2 关键词规则。

### 口语 → 候选 id（参考）


| 用户说法（示例）  | 可考虑                                                                 |
| --------- | ------------------------------------------------------------------- |
| 深色、赛博、科技感 | `neon-cyber`、`electric-studio`、`deep-tech-keynote`、`terminal-green` |
| 发布会、大场、稳重 | `deep-tech-keynote`、`electric-studio`、`bold-signal`                 |
| 商务、营销     | `bold-signal`、`electric-studio`                                     |
| 清新、马卡龙    | `pastel-geometry`、`split-pastel`                                    |
| 极简、白纸黑字   | `swiss-modern`、`paper-ink`                                          |
| 文艺、纸感     | `vintage-editorial`、`paper-ink`                                     |
| 笔记、手账     | `notebook-tabs`                                                     |
| 代码、终端感    | `terminal-green`                                                    |


```bash
echo '{"command":"all","source":"./article.md","format":"html","output_dir":"./output","design_mode":"deep-tech-keynote"}' | node executor.js
```

---

## 运行环境（不在 JSON 里）

由 `**.env**` / 进程环境提供。Step0/1：`**MINIMAX_*` 优先**，否则 `**LLM_*`**；飞书、TTS 等见 `**.env.example**`。


| 阶段               | 需要什么             | 说明                                                            |
| ---------------- | ---------------- | ------------------------------------------------------------- |
| Step0 / 1        | LLM API          | **建议 `MINIMAX_*`**；无则 `**LLM_***`（OpenAI Chat Completions 兼容） |
| `format=video`   | FFmpeg           | README / 系统包管理器                                               |
| `channel=feishu` | 飞书凭证             | `**.env.example**`、Step7                                      |
| Step5            | edge-tts 或 `say` | `**.env.example**`                                            |


---

## 内容变体（摘要）

Step0 为每页选 `content_variant`（如 `panel`、`card_grid`、`timeline` 等），约 **22** 种。完整列表与推断规则 → [CLAUDE.md](CLAUDE.md)「样张系统」「step2_design.js 核心逻辑」。

---

## 单步调用示例

```bash
P=./project

echo '{"command":"step0","source":"./article.md","output_dir":"'"$P"'"}' | node executor.js
echo '{"command":"step1","scenes":"'"$P"'/scenes.json","output_dir":"'"$P"'"}' | node executor.js
echo '{"command":"step2","scenes":"'"$P"'/scenes.json","output_dir":"'"$P"'","design_mode":"terminal-green"}' | node executor.js
echo '{"command":"step3","scenes":"'"$P"'/scenes.json","design_params":"'"$P"'/design_params.json","output_dir":"'"$P"'/html"}' | node executor.js
echo '{"command":"step4","html_dir":"'"$P"'/html","output_dir":"'"$P"'/screenshots"}' | node executor.js
echo '{"command":"step5","scenes":"'"$P"'/scenes.json","output_dir":"'"$P"'/audio"}' | node executor.js
echo '{"command":"step6","format":["video","pdf","html"],"scenes":"'"$P"'/scenes.json","screenshots_dir":"'"$P"'/screenshots","audio_dir":"'"$P"'/audio","output_dir":"'"$P"'"}' | node executor.js
echo '{"command":"step7","channel":"local","output_dir":"'"$P"'"}' | node executor.js
```

---

## 维护者与样张

改样张、加 token、调 LLM prompt → [CLAUDE.md](CLAUDE.md)。原则：**样张 > 代码**，画布 **1920×1080**，token `**{{NAME}}` 全大写**。

---

## 附录：_meta.json

与 npm 包同发的 `**_meta.json`** 供宿主做类型发现；执行语义以 `**executor.js**` 与本文为准。