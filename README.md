# video-producer

将任意文档转化为专业视频演示稿 —— 自动生成逐字稿、TTS 语音、视频，并发布到飞书。

![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ 功能亮点

- 📄 **多源文档读取**：本地文件 / 公开网页 / 飞书文档
- 🤖 **LLM 逐字稿**：StepFun GLM-4 生成（支持降级模板）
- 🗣️ **TTS 语音合成**：Minimax V2（首选）| 腾讯云 | macOS say（保底）
- 🎬 **视频自动合成**：ffmpeg 生成 1920×1080 H.264 视频
- ☁️ **飞书集成**：自动上传视频 + 创建含播放器的文档
- 🛡️ **稳定性优先**：三级降级策略，流程永不中断

---

## 🚀 快速开始

### 1. 安装依赖

```bash
# 使用安装脚本（推荐）
./install.sh

# 或手动安装
brew install ffmpeg node
npm install -g @larksuite/cli
```

### 2. 配置密钥

编辑 `config.json`：
```json
{
  "minimax": {
    "api_key": "sk-...",
    "group_id": "group_..."
  },
  "stepfun": {
    "api_key": "1omUi..."
  }
}
```

### 3. 登录飞书

```bash
lark-cli auth login
```

### 4. 运行

```bash
python3 video-producer.py \
  --document_url="file:///path/to/your/doc.md" \
  --audience="executives" \
  --design_mode="optimized"
```

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
├── video-producer.py      # 主入口
├── config.json            # API keys 配置（需自行填写）
├── config.example.json    # 配置模板
├── install.sh             # 一键安装脚本
├── SKILL.md               # 完整技能文档
├── README.md              # 本文件
├── steps/                 # 8 个步骤实现
│   ├── step0_analyze.py   # 文档读取
│   ├── step1_extract.py   # 要点提炼
│   ├── step2_script.py    # LLM 逐字稿
│   ├── step3_design.py    # 视觉风格
│   ├── step4_html.py      # HTML 生成
│   ├── step5_tts.py       # TTS 合成
│   ├── step6_video.py     # 视频合成
│   └── step7_doc.py       # 飞书文档
└── example/
    └── demo.md            # 示例文档
```

---

## 🔒 安全性

- API keys 存储在本地 `config.json`（**勿提交到 Git**）
- `.gitignore` 已配置，自动排除敏感文件
- 飞书 API 调用通过 `lark-cli` 本地子进程执行（Secret 不离代码）

---

## ⚠️ 已知限制

- Minimax TTS 有配额限制（用尽后自动降级）
- 文档长度建议 < 1000 字（8-10 页）
- 需要稳定的网络环境（调用云端 API）

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
