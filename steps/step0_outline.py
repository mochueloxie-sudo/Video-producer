#!/usr/bin/env python3
"""
Step 0: Structured outline generation (LLM + rule fallback)

Saves to context["outline"]:
  {"main_title": str, "main_subtitle": str, "modules": [{...}]}
Also preserves: full_content, content_type, design_recommendation

"""

import os
import re
import json
from pathlib import Path
from typing import Dict, Any, List

# ============ 枚举值定义（与后续步骤对齐）============
# 内容类型（Step 0 推断 → Step 2/3 使用）
CONTENT_TYPES = [
    "技术文档",    # 技术: 源码、代码、架构、API
    "商业报告",    # 商业: 营收、增长、ROI、战略
    "教学材料",    # 教学: 教程、入门、学习、步骤
    "产品介绍",    # 产品: 功能、体验、用户案例
    "品牌故事",    # 品牌: 创始人、愿景、使命、价值观
    "内部汇报",    # 内部: 会议、复盘、周报、月度
    "其他"        # 默认（无匹配）
]



# 设计模式（Step 0 推荐 → Step 3 使用）
DESIGN_MODES = ["optimized", "default", "minimal"]

# ============ 文档读取 ============
sys_path_added = False
def read_document(url: str) -> str:
  global sys_path_added
  if not sys_path_added:
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    sys_path_added = True
  from step0_analyze import READERS, detect_scheme
  scheme = detect_scheme(url)
  reader = READERS.get(scheme)
  if not reader:
    raise ValueError(f"Unsupported document format: {url}")
  print(f"  Reading [{scheme}]: {url[:60]}...")
  content = reader(url)
  print(f"  OK ({len(content)} chars)")
  return content

# --- Rule-based inference (unchanged) ---
def infer_content_type(content: str) -> str:
  lower = content.lower()
  if any(kw in lower for kw in ["营收", "增长", "roi", "用户量", "kpi", "市场", "战略"]):
    return "商业报告"
  elif any(kw in lower for kw in ["源码", "代码", "架构", "api", "接口", "函数", "类"]):
    return "技术文档"
  elif any(kw in lower for kw in ["教程", "入门", "学习", "原理", "步骤", "指南"]):
    return "教学材料"
  elif any(kw in lower for kw in ["产品", "功能", "体验", "用户案例", "界面"]):
    return "产品介绍"
  elif any(kw in lower for kw in ["创始人", "故事", "愿景", "使命", "价值观"]):
    return "品牌故事"
  elif any(kw in lower for kw in ["会议", "复盘", "周报", "月度", "项目进度"]):
    return "内部汇报"
  else:
    return "其他"

def recommend_design_mode(content_type: str) -> str:
  # 2026-04-06: audience 字段移除，仅基于 content_type 推荐
  mode_map = {
    "技术文档": "minimal",      # 简洁、代码优先
    "商业报告": "optimized",    # 专业、图表感
    "教学材料": "optimized",    # 清晰、图解
    "产品介绍": "default",     # 标准、平衡
    "品牌故事": "default",     # 标准、情感
    "内部汇报": "minimal",     # 高密度、信息优先
    "其他": "optimized"
  }
  return mode_map.get(content_type, "optimized")

# --- LLM outline generation (step-3.5-flash friendly) ---
def llm_generate_outline(content: str, content_type: str) -> Dict[str, Any]:
  # Shorter sample to force focus (step-3.5-flash tends to ramble)
  content_sample = content[:2000]
  
  # Strict prompt for JSON-only output
  prompt = f"""You are a professional content analyst. Read the document excerpt and output a structured outline in JSON format.

Document excerpt:
{content_sample}

Content type: {content_type}

Requirements:
1. main_title: 20-30 chars (use original if present, else summarize)
2. main_subtitle: 50-80 chars, summarize core message
3. modules: 4-12 items（根据内容长度和复杂度灵活调整），each with:
   - id: integer starting from 1
   - title: 15-25 chars
   - key_points: array of 2-3 points (10-20 chars each)
   - start_line: starting line number in original (1-based)
   - end_line: ending line number

CRITICAL FORMAT RULES:
- Output ONLY JSON, absolutely no explanation text, no markdown, no code blocks
- Start with a single '{{' character, end with a single '}}' character
- Do not output ```json or ``` markers
- If you cannot complete, return empty object {{}}, without explanation

Example:
{{
  "main_title": "AI新鲜事 2026-04-06",
  "main_subtitle": "本期聚焦 Liam Fedus 的材料科学革命...",
  "modules": [
    {{"id": 1, "title": "本期主角：Liam Fedus", "key_points": ["Liam Fedus 简介", "Periodic Labs 愿景"], "start_line": 1, "end_line": 50}}
  ]
}}"""
  
  try:
    from llm_client import LLMClient
    provider = os.environ.get('LLM_PROVIDER', 'stepfun')
    llm = LLMClient(provider=provider)
    print(f"  LLM: {llm.provider}/{llm.model}")
    # Increase max_tokens for full JSON
    response = llm.generate(prompt, max_tokens=2000, temperature=0.7)
    
    # --- Robust JSON extraction ---
    response_clean = response.strip()
    
    # Remove markdown code block markers
    if response_clean.startswith('```json'):
      response_clean = response_clean[7:]
    if response_clean.startswith('```'):
      response_clean = response_clean[3:]
    if response_clean.endswith('```'):
      response_clean = response_clean[:-3]
    response_clean = response_clean.strip()
    
    # Strategy: try first '{' (normal models like step-1-8k, minimax, gpt-4o)
    # If that fails (incomplete), try last '{' (for models that prefix explanation like step-3.5-flash)
    start = response_clean.find('{')
    end = response_clean.rfind('}')
    if start >= 0 and end > start:
      json_str = response_clean[start:end+1]
      try:
        outline = json.loads(json_str)
      except Exception:
        # First '{' gave incomplete JSON, try last '{' (for prefixed explanations)
        start2 = response_clean.rfind('{')
        if start2 >= 0 and start2 != start:
          json_str2 = response_clean[start2:end+1]
          outline = json.loads(json_str2)
        else:
          raise
    else:
      raise ValueError("No JSON structure found in response")
    
    # Validate required fields
    if "main_title" not in outline or "modules" not in outline:
      raise ValueError("JSON missing required fields (main_title/modules)")
    
    return outline
    
  except Exception as e:
    print(f"  LLM failed: {e}")
    print(f"  Falling back to rule-based extraction...")
    return fallback_outline(content)

# --- Rule-based fallback (unchanged) ---
def fallback_outline(content: str) -> Dict[str, Any]:
  lines = content.split('\n')
  
  # Extract main title
  main_title = "AI新鲜事 分享"
  for line in lines[:20]:
    if line.startswith('# '):
      main_title = line[2:].strip()
      break
    elif line.startswith('## '):
      main_title = line[2:].strip()
      break
  main_title = re.sub(r'^[^\w\u4e00-\u9fff\d]+', '', main_title).strip() or "文档分享"
  
  # Extract ## headings as modules
  noise = ["附录", "参考资料", "参考", "目录", "总结", "结语", "详细数据"]
  modules = []
  for i, line in enumerate(lines, 1):
    if line.startswith('## '):
      title = line[2:].strip()
      if any(n in title for n in noise):
        continue
      modules.append({
        "id": len(modules) + 1,
        "title": title,
        "key_points": [title],
        "start_line": i,
        "end_line": i + 20
      })
  
  modules = modules[:8]
  
  # Subtitle from first few module titles
  if modules:
    first_titles = [re.sub(r'[^\x00-\x7F\u4e00-\u9fff]', '', m['title']).strip()
                    for m in modules[:3] if len(m['title']) > 1]
    main_subtitle = f"本期聚焦：{'、'.join(first_titles)}等主题" if first_titles else "涵盖文档核心内容"
  else:
    main_subtitle = "涵盖文档核心内容"
  
  return {
    "main_title": main_title,
    "main_subtitle": main_subtitle,
    "modules": modules
  }

# --- Main function ---
def step0_outline(document_url: str, audience_hint: str, context: Dict[str, Any]) -> Dict[str, Any]:
  print("\n🔍 Step 0: Content analysis + structured outline...")
  
  # 1. Read document
  content = read_document(document_url)
  context["full_content"] = content
  
  # 2. Rule-based inference
  content_type = infer_content_type(content)
  design = recommend_design_mode(content_type)
  print(f"  Type: {content_type}")
  print(f"  Design: {design}")
  
  # 3. LLM outline (or fallback)
  outline = llm_generate_outline(content, content_type)
  print(f"  Title: {outline['main_title']}")
  print(f"  Subtitle: {outline['main_subtitle'][:60]}...")
  print(f"  Modules: {len(outline['modules'])}")
  for m in outline['modules']:
    print(f"    {m['id']}. {m['title'][:50]}")
  
  # 4. Save to context
  context.update({
    "content_type": content_type,
    "design_recommendation": design,
    "outline": outline
  })
  
  return {
    "content_type": content_type,
    "design_recommendation": design,
    "outline": outline
  }

if __name__ == "__main__":
  ctx = {}
  result = step0_outline(
    "https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh",
    "executives",
    ctx
  )
  print("\n=== Result ===")
  print(f"Title: {result['outline']['main_title']}")
  print(f"Subtitle: {result['outline']['main_subtitle']}")
  print(f"Modules: {len(result['outline']['modules'])}")
