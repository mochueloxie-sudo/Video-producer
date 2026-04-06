#!/usr/bin/env python3
"""
Step 2: 逐字稿生成（LLM 驱动）

输入：
  - slides: Step 1-1.5 生成的页面列表
  - full_content: 原文全文（用于参考）
  - content_type: 内容类型

输出：
  - scripts: List[str]，每页对应一段逐字稿（150-200 字）

LLM 直接为每页生成自然讲解，不再用规则摘句拼接。
"""

import os
from typing import Dict, Any, List

def step2_llm_scripts(slides: List[Dict[str, Any]], full_content: str, content_type: str, context: Dict[str, Any]) -> List[str]:
  """
  使用 LLM 为所有页面生成逐字稿

  返回 scripts 列表，保存到 context["scripts"]
  """

  # 构建 prompt
  prompt = build_scripts_prompt(slides, full_content, content_type)

  # 调用 LLM
  from llm_client import LLMClient
  provider = os.environ.get('LLM_PROVIDER', 'stepfun')
  llm = LLMClient(provider=provider)
  print(f"  LLM: {llm.provider}/{llm.model}")

  response = llm.generate(prompt, max_tokens=3000, temperature=0.8)

  # 解析输出
  scripts = parse_scripts_response(response, len(slides))

  # Fallback：解析失败则用规则生成
  if not scripts or len(scripts) != len(slides):
    print("  ⚠️  LLM 输出解析失败，使用规则 fallback")
    scripts = fallback_scripts(slides, full_content, content_type)

  context["scripts"] = scripts
  return scripts


def build_scripts_prompt(slides: List[Dict[str, Any]], full_content: str, content_type: str) -> str:
  """构建 LLM prompt"""

  # 内容类型讲解风格
  style_map = {
    "技术文档": "语言严谨，侧重技术原理、架构、实现细节，使用专业术语，逻辑清晰。",
    "商业报告": "语言专业，聚焦商业价值、应用场景、落地影响，数据驱动，突出 ROI。",
    "教学材料": "语言亲切，循序渐进，多用比喻和示例，帮助理解和记忆。",
    "产品介绍": "语言生动，突出功能亮点和用户体验，讲好产品故事。",
    "品牌故事": "语言富有情感，传递愿景和价值观，引发共鸣。",
    "内部汇报": "语言简洁直接，列事实、说问题、给方案，注重行动项。",
    "其他": "语言自然流畅，概括核心内容，清晰易懂。"
  }
  style = style_map.get(content_type, style_map["其他"])

  # 构建页面描述
  pages_text = ""
  for i, slide in enumerate(slides, 1):
    if slide.get("is_cover"):
      pages_text += f"\n第{i}页（封面）：\n  标题：{slide['slide_title']}\n  副标题：{slide.get('slide_subtitle', '')}\n"
    else:
      pages_text += f"\n第{i}页（内容）：\n  标题：{slide['slide_title']}\n  要点：{slide.get('slide_content', '')}\n"

  prompt = f"""你是一位专业的讲解员，请为以下演示文稿的每一页生成逐字稿（讲稿）。

【文档信息】
内容类型：{content_type}
讲解风格：{style}

【演示页面】（共 {len(slides)} 页）
{pages_text}

【原文参考】（前 2500 字，用于补充细节）
{full_content[:2500]}

【生成要求】
1. 封面（第1页）：欢迎语 + 标题 + 副标题，50-80 字
2. 内容页（第2-{len(slides)}页）：每页 150-200 字，口语化
   - 开头："接下来，我们看[页面标题]。"
   - 主体：结合要点和原文，自然展开讲解
   - 结尾：根据内容自然过渡（最后一页除外）
3. 最后一页：仅说"感谢聆听。"（不要总结内容）
4. **特殊元素标记**（必须遵守）：
   - 数字（2位及以上）用 <num>...</num> 包裹，如：覆盖 <num>70%</num> 的企业场景
   - 代码、工具名、技术栈用 <code>...</code> 包裹，如：使用 <code>LLMClient</code> 调用
   - 人物姓名用 <quote>...</quote> 包裹，如：<quote>Liam Fedus</quote> 强调...
   - 核心观点、关键结论用 <insight>...</insight> 包裹，如：<insight>AI要真正改变世界，必须与物理世界闭环交互</insight>
5. 输出格式：每页以 "=== 第X页 ===" 开头，后跟逐字稿正文

【输出示例】
=== 第1页 ===
大家好，今天分享：AI新鲜事 2026-04-06。Liam Fedus 引领材料科学革命...

=== 第2页 ===
接下来，我们看本期主角：Liam Fedus。<quote>Liam Fedus</quote> 是 Periodic Labs 联合创始人...
这涉及 <code>上下文层</code> 的核心技术，覆盖 <num>70%</num> 的企业场景。
<insight>AI要真正改变世界，必须与物理世界闭环交互</insight>...

现在，请生成逐字稿："""

  return prompt


def parse_scripts_response(response: str, expected_count: int) -> List[str]:
  """解析 LLM 输出的逐字稿列表"""

  import re
  # 按 "=== 第X页 ===" 分割
  pattern = r'=== 第\d+页 ==='
  blocks = re.split(pattern, response)

  scripts = []
  for block in blocks:
    block = block.strip()
    if block:
      # 清理 markdown 代码块标记
      block = re.sub(r'```.*?```', '', block, flags=re.DOTALL)
      block = block.strip()
      if block:
        scripts.append(block)

  # 如果第一页没有分隔符，可能是封面直接在最前
  if len(scripts) == expected_count - 1 and response.startswith('=== 第1页 ==='):
    # 正常
    pass
  elif len(scripts) < expected_count:
    # 尝试从 "第1页：" 格式提取
    pages = re.findall(r'第\d+页：?(.*?)(?=第\d+页：?|\Z)', response, re.DOTALL)
    if len(pages) >= expected_count:
      scripts = [p.strip() for p in pages[:expected_count]]

  return scripts


def fallback_scripts(slides: List[Dict[str, Any]], full_content: str, content_type: str) -> List[str]:
  """规则 fallback：生成基础逐字稿（原 step2_script 逻辑）"""
  scripts = []

  # 封面
  cover = slides[0]
  opener = "大家好，今天分享："
  subtitle = cover.get('slide_subtitle', '')
  script = f"{opener}{cover['slide_title']}。{subtitle[:100]}"
  scripts.append(script[:200])

  # 内容页（从原文提取）
  lines = full_content.split('\n')
  for slide in slides[1:]:
    # 尝试从原文找对应段落
    start_line = 0
    for i, line in enumerate(lines):
      if slide['slide_title'][:10] in line:
        start_line = i
        break
    paragraph = '\n'.join(lines[start_line:start_line+10])
    script = paragraph[:200].replace('\n', '。')
    scripts.append(script)

  return scripts


if __name__ == "__main__":
  import sys
  sys.path.insert(0, '..')
  from step0_outline import step0_outline
  from step1_llm_slides import step1_llm_slides

  ctx = {}
  step0_outline("https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh", "auto", ctx)

  outline = ctx['outline']
  slides = step1_llm_slides(outline, ctx['full_content'], ctx['content_type'], ctx)

  scripts = step2_llm_scripts(slides, ctx['full_content'], ctx['content_type'], ctx)

  print(f"\n生成 {len(scripts)} 条逐字稿：")
  for i, s in enumerate(scripts, 1):
    print(f"\n--- 第{i}页 ({len(s)}字) ---")
    print(s[:100] + "..." if len(s) > 100 else s)
