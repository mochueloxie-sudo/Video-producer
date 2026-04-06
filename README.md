# video-producer

将任意文档转化为专业视频演示稿 —— 自动生成逐字稿、TTS 语音、视频，并发布到飞书。

![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ 功能亮点

- 📄 **多源文档读取**：本地文件 / 公开网页 / 飞书文档
- 🤖 **LLM 智能内容分析**：StepFun GLM-4 自动推断内容类型 + 生成大纲 + 逐字稿 + **视觉布局分析**（2026-04-06 增强）
- 🎨 **动态视觉设计**：基于内容类型 + LLM 内容感知微调 + 每页布局智能推荐
- 🖼️ **LLM 增强渲染**：Step 4 引入 LLM 批量分析，每页获得专属布局建议（`layout_hint` / `special_elements`），告别模板化
- 🗣️ **TTS 语音合成**：Minimax V2（首选）| 腾讯云 | macOS say（保底）
- 🎬 **视频自动合成**：ffmpeg 生成 1920×1080 H.264 视频
- ☁️ **飞书集成**：自动上传视频 + 创建含播放器的文档
- 🛡️ **稳定性优先**：三级降级策略，流程永不中断

---

## 🎯 核心流程（8 步）

| Step | 名称 | 说明 | LLM |
|------|------|------|-----|
| 0 | 内容分析 | 推断内容类型 + 推荐设计模式 | ✅ GLM-4 |
| 1 | 大纲生成 | 从文档提取核心要点 | ✅ GLM-4 |
| 1.5 | 页面精炼 | 将大纲拆分为独立幻灯片页面 | ✅ GLM-4 |
| 2 | 逐字稿生成 | 为每页生成口语化讲稿 | ✅ GLM-4 |
| 3 | 视觉风格确定 | **LLM 内容感知微调** + 扁平化输出 | ✅ GLM-4（内容分析） |
| 4 | HTML 生成 | **LLM 批量布局分析 + 智能渲染**（2026-04-06 增强） | ✅ Step-1-8k（批量分析） |
| 5 | TTS 语音 | Minimax V2 → 腾讯云 → macOS say 自动降级 | ❌（API 调用） |
| 6 | 视频合成 | ffmpeg 合成 1920×1080 视频 | ❌（本地处理） |
| 7 | 飞书上传播放器 | 创建云文档 + 嵌入视频 | ❌（API 调用） |

> **2026-04-06 更新**：Step 3 函数签名简化为三参数 `(content_type, design_mode, context)`；Step 4 全面重写，引入页面类型约束和渲染逻辑优化。
  --document_url="file:///path/to/your/doc.md" \
  --design_mode="optimized"
```

**参数说明：**
- `--document_url`: 文档地址（支持 `file://`, `https://`, 飞书 `docx://`）
- `--design_mode`: 设计模式 — `default`（基础）/ `optimized`（增强，推荐）/ `minimal`（极简）
- `--tts_provider`: TTS 提供商 — `minimax` / `tencent` / `macos`
- `--output_quality`: 输出质量 — `high`（高码率）/ `medium` / `low`

**🎯 智能推荐：**
- 如果不指定 `design_mode`，系统会根据内容类型自动推荐（Step 0 输出）
- 新版 Step 4 会为每页进行 LLM 布局分析，动态调整视觉风格

---

## 📖 详细文档

详见 [SKILL.md](SKILL.md) —— 包含完整用法、配置说明、故障排查。

---

## 🎯 使用场景

| 场景 | 推荐参数 |
|------|----------|
| 高管汇报 | `--audience=executives --design_mode=optimized` |
| 技术分享 | `--audience=developers --design_mode=default` |
| 教学材料 | `--audience=students --design_mode=optimized` |
| 内部培训 | `--audience=internal --design_mode=minimal` |

---

## 🛠️ 技术栈

- **后端**：Python 3.9+（标准库 + subprocess）
- **TTS**：Minimax T2A V2 / 腾讯云 TTS / macOS say
- **LLM**：StepFun GLM-4 / 内置模板
- **视频**：ffmpeg 8.1
- **截图**：Puppeteer (Node.js)
- **云服务**：飞书 Open API

---

## 📂 项目结构

```
video-producer/
├── video-producer.py      # 主入口（Step 0→7 流水线）
├── config.json            # API keys 配置（需自行填写）
├── config.example.json    # 配置模板
├── install.sh             # 一键安装脚本
├── SKILL.md               # 完整技能文档（含 8 步详解）
├── README.md              # 本文件
├── steps/                 # 8 个步骤实现
│   ├── step0_outline.py   # 文档分析 + 内容类型推断 + outline 生成
│   ├── step1_5_refine.py  # 页面精炼（封面 + 内容页）
│   ├── step2_llm_scripts.py  # LLM 逐字稿生成
│   ├── step3_design.py    # 视觉风格 + LLM 内容感知微调
│   ├── step4_html.py      # ⭐ LLM 布局分析 + 智能 HTML 渲染（2026-04-06 增强）
│   ├── step5_tts.py       # TTS 合成（多提供商降级）
│   ├── step6_video.py     # ffmpeg 视频合成
│   └── step7_doc.py       # 飞书文档创建 + 视频上传
├── llm_client.py          # LLM 统一客户端（Minimax / StepFun / OpenAI）
└── example/
    └── demo.md            # 示例文档
```

---

## 🔒 安全性

- API keys 存储在本地 `config.json`（**勿提交到 Git**）
- `.gitignore` 已配置，自动排除敏感文件
- 飞书 API 调用通过 `lark-cli` 本地子进程执行（Secret 不离代码）

---

## ⚠️ 建议与限制

- **文档长度**：建议 < 1000 字，约 8-12 页（每页一个核心观点）
- **TTS 配额**：Minimax 个人账户有使用上限，用尽后自动降级为腾讯云或 say（不影响他人）
- **网络环境**：需要稳定连接（调用云端 API）

---

## 📄 License

MIT —— 可自由修改、分发、商用。

---

## 🙋 问题反馈

如有问题，请查看：
1. `SKILL.md` 故障排查章节
2. 运行日志中的 `❌` 错误信息
3. 提交 Issue（附上错误片段）

---

## 👥 Community

### 🤝 如何贡献

欢迎贡献代码、报告问题、提出建议！请阅读：

- [Contributing Guide](CONTRIBUTING.md) —— 完整的提交流程
- [Code of Conduct](CODE_OF_CONDUCT.md) —— 社区行为准则

### 🐛 报告 Bug

使用 [Bug Report 模板](.github/ISSUE_TEMPLATE/bug_report.md)，提供复现步骤和环境信息。

### 💡 功能请求

使用 [Feature Request 模板](.github/ISSUE_TEMPLATE/feature_request.md)，描述你的需求和使用场景。

### 📝 提交代码

请参考 [Pull Request 模板](.github/PULL_REQUEST_TEMPLATE.md)，确保 PR 描述完整。

### 🔒 安全问题

发现安全漏洞请勿公开提交 Issue，请通过 [GitHub Security Advisory](https://github.com/mochueloxie-sudo/Video-producer/security/advisories) 联系维护者。

---

**Made with ❤️ by TeeClaw**
