#!/usr/bin/env python3
"""
Step 1-2: 逐字稿生成（LLM 驱动）

职责：
1. 接收 Step 0 的 outline 和 full_content
2. 使用 LLM 直接生成所有页面的逐字稿（封面 + 内容页）
3. 返回 scripts 列表，保存到 context["scripts"]

优势：
- 避免规则生成的机械感
- 讲解更自然、有逻辑、有重点
- 简化流程（合并 Step 1 和 Step 2）
"""

import os
from typing import Dict, Any, List

def step1_2_scripts(outline: Dict[str, Any], full_content: str, content_type: str, context: Dict[str, Any]) -> List[str]:
  """
  使用 LLM 生成所有页面的逐字稿

  输入：
    - outline: Step 0 生成的结构化大纲
    - full_content: 文档全文
    - content_type: 内容类型（影响讲解风格）
    - context: 全局上下文（可保存 scripts）

  输出：
    - scripts: List[str]，长度 = 1 + len(outline["modules"])

  要求：
    - 封面：50-80 字，欢迎 + 标题 + 副标题
    - 内容页：150-200 字，口语化，结合 key_points 和原文
    - 最后一页：仅"感谢聆听"，不总结内容
    - 输出直接是字符串列表，无需 JSON 解析
  """

  # 提取大纲信息
  main_title = outline.get("main_title", "内容分享")
  main_subtitle = outline.get("main_subtitle", "")
  modules = outline.get("modules", [])

  # 构建 LLM prompt
  prompt = build_script_prompt(main_title, main_subtitle, modules, full_content, content_type)

  # 调用 LLM
  from llm_client import LLMClient
  provider = os.environ.get('LLM_PROVIDER', 'stepfun')
  llm = LLMClient(provider=provider)
  print(f"  LLM: {llm.provider}/{llm.model}")

  response = llm.generate(prompt, max_tokens=3000, temperature=0.8)

  # 解析输出（期望格式：每页以 === 页码 === 分隔）
  scripts = parse_scripts(response)

  # 备用：如果 LLM 输出格式混乱，用规则生成兜底
  if not scripts or len(scripts) != len(modules) + 1:
    print("  ⚠️  LLM 输出格式异常，使用规则兜底生成")
    scripts = fallback_generate_scripts(main_title, main_subtitle, modules, full_content, content_type)

  # 保存到 context
  context["scripts"] = scripts
  context["total_pages"] = len(scripts)

  return scripts


def build_script_prompt(title: str, subtitle: str, modules: List[Dict], full_content: str, content_type: str) -> str:
  """构建 LLM prompt"""

  # 内容类型讲解风格指引
  style_guides = {
    "技术文档": "讲解时侧重技术原理、架构设计、实现细节，使用专业术语，保持严谨。",
    "商业报告": "讲解时聚焦商业价值、应用场景、落地影响，数据驱动，突出 ROI。",
    "教学材料": "讲解时循序渐进，多用比喻，强调基础概念和示例理解。",
    "产品介绍": "讲解时突出功能亮点、用户体验、差异化优势，多讲故事。",
    "品牌故事": "讲解时注重情感共鸣，传递愿景使命，讲述背后故事。",
    "内部汇报": "讲解时直击重点，同步进度、风险、下一步，简洁高效。",
    "其他": "讲解时清晰易懂，概括核心内容。"
  }

  style = style_guides.get(content_type, style_guides["其他"])

  # 构建模块信息
  modules_text = ""
  for m in modules:
    modules_text += f"\n第{m['id']}页：{m['title']}\n"
    if m.get('key_points'):
      modules_text += f"  要点：{'、'.join(m['key_points'])}\n"

  prompt = f"""你是一位专业的讲解员，请为以下内容生成逐字稿（讲稿）。

【文档信息】
标题：{title}
副标题：{subtitle}
内容类型：{content_type}
讲解风格：{style}

【大纲结构】
共 {len(modules) + 1} 页（第1页封面，第2-{len(modules)+1}页内容）：
{modules_text}

【原文参考】（前 2500 字）
{full_content[:2500]}

【生成要求】
1. 封面（第1页）：欢迎语 + 标题 + 副标题，50-80 字
2. 内容页（第2-{len(modules)+1}页）：每页 150-200 字，口语化，结合大纲要点和原文
   - 开头："接下来，我们看[模块标题]。"
   - 主体：展开讲解，补充原文细节
   - 结尾：根据内容自然过渡（最后一页除外）
3. 最后一页：仅说"感谢聆听。"（不要总结内容）
4. 输出格式：每页以 "=== 第X页 ===" 开头，后跟逐字稿正文

【输出示例】
=== 第1页 ===
大家好，今天分享：{title}。{subtitle[:50]}...

=== 第2页 ===
接下来，我们看[模块标题]。...

现在，请生成逐字稿："""

  return prompt


def parse_scripts(response: str) -> List[str]:
  """解析 LLM 输出的逐字稿"""
  scripts = []

  # 按 "=== 第X页 ===" 分割
  import re
  blocks = re.split(r'=== 第\d+页 ===', response)

  for block in blocks:
    block = block.strip()
    if block:
      # 清理可能的 markdown 标记
      block = re.sub(r'```.*?```', '', block, flags=re.DOTALL)
      block = block.strip()
      if block:
        scripts.append(block)

  return scripts


def fallback_generate_scripts(title: str, subtitle: str, modules: List[Dict], full_content: str, content_type: str) -> List[str]:
  """规则兜底：生成基础逐字稿"""
  scripts = []

  # 封面
  cover = f"大家好，今天分享：{title}。{subtitle}"
  scripts.append(cover[:200])

  # 内容页（从原文提取句子拼凑）
  lines = full_content.split('\n')
  for m in modules:
    start = m.get("start_line", 1) - 1
    end = min(m.get("end_line", start + 20), len(lines))
    paragraph = '\n'.join(lines[start:end])

    # 提取前 150 字作为基础
    script = paragraph[:200].replace('\n', '。')
    scripts.append(script)

  return scripts


if __name__ == "__main__":
  # 测试
  import sys
  sys.path.insert(0, '..')
  from step0_outline import step0_outline

  ctx = {}
  step0_outline("https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh", "auto", ctx)

  outline = ctx['outline']
  scripts = step1_2_scripts(outline, ctx['full_content'], ctx['content_type'], ctx)

  print(f"\n生成 {len(scripts)} 条逐字稿：")
  for i, s in enumerate(scripts, 1):
    print(f"\n--- 第{i}页 ({len(s)}字) ---")
    print(s[:100] + "..." if len(s) > 100 else s)
