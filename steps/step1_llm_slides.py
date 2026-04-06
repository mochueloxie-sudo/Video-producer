#!/usr/bin/env python3
"""
Step 1-1.5: 页面生成（LLM 驱动）

合并原 Step 1（提取要点）和 Step 1.5（页面精炼），直接使用 LLM 生成 slides。

输入：
  - outline: Step 0 的结构化大纲
  - full_content: 文档全文
  - content_type: 内容类型

输出：
  - slides: List[Dict]，包含：
    - is_cover: bool
    - slide_title, slide_subtitle (封面)
    - slide_title, slide_content (内容页，bullet 列表)

相比规则生成，LLM 生成：
  - 标题更自然、吸引人
  - bullet 点更精炼、有逻辑
  - 避免机械的"• "开头（可保留）
"""

import os
import re
from typing import Dict, Any, List

def step1_llm_slides(outline: Dict[str, Any], full_content: str, content_type: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
  """
  使用 LLM 生成所有页面内容

  返回 slides 列表，保存到 context["slides"]
  """

  main_title = outline.get("main_title", "内容分享")
  main_subtitle = outline.get("main_subtitle", "")
  modules = outline.get("modules", [])

  # 构建 prompt
  prompt = build_slides_prompt(main_title, main_subtitle, modules, full_content, content_type)

  # 调用 LLM
  from llm_client import LLMClient
  provider = os.environ.get('LLM_PROVIDER', 'stepfun')
  llm = LLMClient(provider=provider)
  print(f"  LLM: {llm.provider}/{llm.model}")

  response = llm.generate(prompt, max_tokens=2500, temperature=0.7)

  # 解析输出
  slides = parse_slides_response(response, main_title, main_subtitle)

  # Fallback：如果解析失败，用规则生成
  if not slides or len(slides) != len(modules) + 1:
    print("  ⚠️  LLM 输出解析失败，使用规则 fallback")
    slides = fallback_slides(outline, full_content)

  context["slides"] = slides
  return slides


def build_slides_prompt(title: str, subtitle: str, modules: List[Dict], full_content: str, content_type: str) -> str:
  """构建生成 slides 的 prompt"""

  # 内容类型风格指引
  style_guides = {
    "技术文档": "标题精准、bullet 点体现技术层次、突出关键术语",
    "商业报告": "标题突出价值、bullet 点体现数据和影响、强调落地",
    "教学材料": "标题易懂、bullet 点循序渐进、多用比喻",
    "产品介绍": "标题吸引人、bullet 点突出功能优势、故事化",
    "品牌故事": "标题情感化、bullet 点传递理念、引发共鸣",
    "内部汇报": "标题直击重点、bullet 点清晰列事实、注重行动",
    "其他": "标题概括核心、bullet 点清晰有条理"
  }
  style = style_guides.get(content_type, style_guides["其他"])

  modules_text = "\n".join([
    f"  {m['id']}. {m['title']}\n     要点：{'、'.join(m.get('key_points', [])[:3])}"
    for m in modules
  ])

  prompt = f"""你是一位专业的演示文稿设计师。根据以下大纲和原文，生成演示文稿的页面内容。

【文档信息】
标题：{title}
副标题：{subtitle}
内容类型：{content_type}
风格要求：{style}

【模块结构】（共 {len(modules)} 个内容页）
{modules_text}

【原文参考】（前 3000 字）
{full_content[:3000]}

【输出要求】
生成 {len(modules) + 1} 页内容（第1页封面，第2-{len(modules)+1}页对应上述模块）：

第1页（封面）：
  标题：{title}
  副标题：{subtitle}

第2-{len(modules)+1}页（内容页）：
  每页格式：
    Title: [页面标题（可优化，15-25字）]
    Content: |
      • [要点1，20-40字]
      • [要点2，20-40字]
      • [要点3，20-40字]

要求：
1. 标题可以优化，更吸引人、更精炼
2. Content 的 bullet 点要基于原文和 key_points，不要编造
3. 每页 2-4 个 bullet 点，总计 150-250 字
4. 输出纯文本，不要 markdown 标记

现在开始输出："""

  return prompt


def parse_slides_response(response: str, main_title: str, main_subtitle: str) -> List[Dict[str, Any]]:
  """解析 LLM 输出的 slides"""

  slides = []

  # 第1页：封面（从文本开头提取）
  # 期望格式：标题和副标题在开头
  cover = {
    "is_cover": True,
    "slide_title": main_title,
    "slide_subtitle": main_subtitle
  }
  slides.append(cover)

  # 内容页：按 "Title:" / "Content:" 块分割
  blocks = re.split(r'\n\s*Title:\s*', response)[1:]  # 跳过第一个（可能是封面）

  for block in blocks:
    block = block.strip()
    if not block:
      continue

    # 提取标题（到第一个换行或 "Content:"）
    title_match = re.match(r'(.+?)(?:\n|$)', block)
    if not title_match:
      continue
    title = title_match.group(1).strip()

    # 提取 Content 部分
    content_match = re.search(r'Content:\s*\|\s*\n(.*?)(?=\n\s*Title:|\Z)', block, re.DOTALL)
    if content_match:
      content = content_match.group(1).strip()
    else:
      # 如果没有 Content 标记，取剩余全部
      content = block[len(title):].strip()

    # 清理 content：提取 bullet 行
    bullet_lines = []
    for line in content.split('\n'):
      line = line.strip()
      if line.startswith('•'):
        bullet_lines.append(line)
      elif re.match(r'^[0-9]+[.、]', line):  # 数字列表
        bullet_lines.append('• ' + line.split(' ', 1)[1] if ' ' in line else line)

    slide = {
      "is_cover": False,
      "slide_title": title,
      "slide_content": "\n".join(bullet_lines) if bullet_lines else content,
      "original_paragraph": ""  # 稍后填充
    }
    slides.append(slide)

  return slides


def fallback_slides(outline: Dict[str, Any], full_content: str) -> List[Dict[str, Any]]:
  """规则 fallback：生成基础 slides（原 step1_5_refine 逻辑）"""
  slides = []

  # 封面
  slides.append({
    "slide_title": outline["main_title"],
    "slide_subtitle": outline["main_subtitle"],
    "is_cover": True
  })

  lines = full_content.split('\n')
  for module in outline["modules"]:
    start = module.get("start_line", 1) - 1
    end = min(module.get("end_line", start + 20), len(lines))
    paragraph = '\n'.join(lines[start+1:end])

    # 生成 bullet 点（从 key_points）
    key_points = module.get("key_points", [])
    if key_points:
      content = "\n".join([f"• {kp}" for kp in key_points[:4]])
    else:
      # 从段落提取首句
      sentences = re.split(r'[。！]', paragraph)
      content = "\n".join([f"• {s}。" for s in sentences[:3] if s.strip()])

    slides.append({
      "slide_title": module["title"],
      "slide_content": content,
      "original_paragraph": paragraph,
      "is_cover": False
    })

  return slides


if __name__ == "__main__":
  import sys
  sys.path.insert(0, '..')
  from step0_outline import step0_outline

  ctx = {}
  step0_outline("https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh", "auto", ctx)

  outline = ctx['outline']
  slides = step1_llm_slides(outline, ctx['full_content'], ctx['content_type'], ctx)

  print(f"\n生成 {len(slides)} 页 slides：")
  for i, s in enumerate(slides, 1):
    print(f"\n--- 第{i}页 ---")
    print(f"标题: {s['slide_title']}")
    if s.get('is_cover'):
      print(f"副标题: {s.get('slide_subtitle', '')}")
    else:
      print(f"内容:\n{s['slide_content'][:200]}")
