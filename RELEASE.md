# video-producer v1.1.0

将任意文档转化为专业视频演示稿 —— 自动生成逐字稿、TTS 语音、视频，并发布到飞书。

---

## 🎯 版本亮点（2026-04-06）

### 🚀 重大优化：Step 4 HTML 生成全面 LLM 增强

**问题**：旧版规则模板无法适应多样化的内容布局，导致视觉表现千篇一律。

**解决方案**：引入 LLM 批量布局分析 + 智能渲染约束，实现每页定制化视觉设计。

**核心改进**：

| 维度 | 旧版（v1.0.0） | 新版（v1.1.0） |
|------|---------------|---------------|
| 布局决策 | 固定规则（关键词触发） | ✅ LLM 语义理解 + 规则约束 |
| 页面类型区分 | 无 | ✅ cover / content / summary 自动识别 |
| 内容页对齐 | 常误判为居中 | ✅ 强制左对齐（`left_text_right_space`） |
| 右空占位 | 未实现 | ✅ 真正生成虚线占位符（预留图片位） |
| 装饰克制 | 无约束 | ✅ `center_glow` 仅封面+低密度时添加 |
| 标题强调 | 全部开启 | ✅ 仅封面/总结页开启 |

**测试结果**（AI新鲜事 2026-04-05 文档）：
```
第1页（封面）: center_focus + big_numbers/quotes  ✅
第2页（内容）: left_text_right_space + quotes        ✅（修复误判）
第3页（内容）: left_text_right_space + quotes        ✅
第4页（总结）: center_focus + big_numbers/quotes     ✅
```

### 🔧 Step 3 简化

- 函数签名从四参数改为三参数：`step3_get_design_params(content_type, design_mode, context)`
- 移除已废弃的 `audience_inferred` 参数
- 修复 `get_default_params()` 和 `get_minimal_params()` 缺少 `subheading` 字段的问题

---

## ✨ 核心功能

- 📄 **多源文档读取**：本地文件 / 公开网页 / 飞书文档
- 🤖 **LLM 智能内容分析**：StepFun GLM-4 自动推断内容类型 + 生成大纲 + 逐字稿
- 🎨 **LLM 内容感知微调**：Step 3 基于全文语义推荐视觉参数（accent_tone / decoration_density / layout_density）
- 🖼️ **LLM 增强渲染**：Step 4 批量分析每页布局，智能选择 `layout_hint` + `special_elements` + `spacing_override`
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
    "api_key": "1Jj2goyzxAxUp2uUjbHiimFk5dbjabksIvM2Ebh0OZhW5HihlaH2An9y4NRNh5GC2"
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
  --design_mode="optimized"
```

---

## 📖 完整文档

- [SKILL.md](./SKILL.md) —— 详细用法、配置、故障排查
- [README.md](./README.md) —— 项目介绍与技术栈

---

## 🔧 技术栈

- **后端**：Python 3.9+
- **LLM**：StepFun GLM-4（内容分析） + Step-1-8k（布局分析）
- **TTS**：Minimax T2A V2 / 腾讯云 TTS / macOS say
- **视频**：ffmpeg 8.1
- **截图**：Puppeteer (Node.js)
- **云服务**：飞书 Open API

---

## 🎯 使用场景

| 场景 | 推荐参数 |
|------|----------|
| 高管汇报 | `--design_mode=optimized`（增强视觉） |
| 技术分享 | `--design_mode=minimal`（极简代码友好） |
| 教学材料 | `--design_mode=optimized`（图解友好） |
| 内部培训 | `--design_mode=default`（平衡） |

---

## 🛡️ 安全说明

- API keys 存储在本地 `config.json`（**勿分享**）
- `.gitignore` 已配置，自动排除敏感文件
- 飞书 API 调用通过 `lark-cli` 本地子进程执行（Secret 不离代码）

---

## ⚠️ 已知限制

- Minimax TTS 有配额限制（用尽后自动降级）
- 文档长度建议 < 1000 字（8-10 页）
- 需要稳定的网络环境（调用云端 API）
- Step 4 的 `left_text_right_space` 布局目前仅生成占位符，图片需手动插入（未来可扩展）

---

## 📄 License

MIT —— 可自由修改、分发、商用。

---

## 🙋 问题反馈

查看 [SKILL.md](./SKILL.md) 故障排查章节，或提交 Issue。

---

**Made by TeeClaw** · 2026-04-06
