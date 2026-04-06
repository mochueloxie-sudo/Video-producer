#!/usr/bin/env python3
"""
Step 4: HTML 生成（LLM 增强版）

核心优化：
1. LLM 分析每页布局（区分封面/内容/总结页）
2. 渲染约束：内容页强制左对齐，装饰克制
3. left_text_right_space 真正生成右空占位

更新（2026-04-06）：全面重写，修复渲染逻辑
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

TEMP_DIR = Path("/tmp/video-producer-slides")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# ============ LLM 布局分析 Prompt（改进版）============

LAYOUT_ANALYSIS_PROMPT = """你是演示文稿视觉设计师。根据内容分析，为这页幻灯片生成最优的视觉布局方案。

【页面信息】
页标题：{slide_title}
页内容：{slide_content}
页码：第 {page_num} 页（共 {total_pages} 页）
内容类型：{content_type}
页面类型：{page_type}  # cover=封面 / content=内容页 / summary=总结页

【当前设计基础】
- primary_color: {primary_color}
- accent_color: {accent_color}
- spacing: {spacing}
- decoration_count: {decoration_count}

【布局提示说明】
- center_focus: 居中对齐，适合**封面**/**核心观点总结页**（内容少、重点突出）
- left_text_right_space: 左文右空，适合叙事型内容（预留图片位）
- two_columns: 双栏布局，适合对比/优劣/并列内容
- minimal: 极简布局，适合代码/数据密集内容
- full_content: 全内容展示，适合步骤流程/清单列表

【特殊元素说明】
- big_numbers: 大数字突出（用于增长率/统计数据）
- quotes: 人物/专家引言
- code_blocks: 代码或技术术语块
- comparison: AB 对比
- steps: 步骤流程
- timeline: 时间线

【重要原则】
1. **封面页**（page_type=cover）：必须用 center_focus，可加 center_glow 装饰
2. **内容页**（page_type=content）：优先 left_text_right_space 或 minimal，避免过度装饰
3. **总结页**（page_type=summary）：可用 center_focus
4. 装饰宜精简，每页 ≤ 2 个装饰元素

【输出要求】
返回 JSON（仅 JSON，无 markdown 标记）：
{{
  "layout_hint": "center_focus",
  "special_elements": ["big_numbers", "quotes"],
  "spacing_override": "spacious",
  "decoration_extra": ["center_glow"],
  "content_density": "low",
  "title_emphasis": true
}}"""

# ============ LLM 客户端 ============

def get_llm_client():
  """获取 LLM 客户端"""
  import sys
  sys.path.insert(0, str(Path(__file__).parent))
  from llm_client import LLMClient
  provider = os.environ.get('LLM_PROVIDER', 'stepfun')
  return LLMClient(provider=provider)

# ============ 辅助函数 ============

def detect_content_patterns(page_content: str, key_point: str, content_type: str) -> List[str]:
  """检测内容特征（复用旧版逻辑）"""
  patterns = []
  content = (page_content + key_point).lower()
  
  if re.search(r'\b\d{2,}(?:\.\d+)?[%亿万人]?\b', content):
    patterns.append('big_numbers')
  if any(kw in content for kw in ['"', '"', '"', '"', 'said', '指出', '认为', '称']):
    patterns.append('quotes')
  if any(kw in content for kw in ['api', 'python', 'code', '函数', '类', 'llm', 'gpt', '模型']):
    patterns.append('code_blocks')
  if any(kw in content for kw in ['对比', 'vs', '优劣', '差异']):
    patterns.append('comparison')
  if any(kw in content for kw in ['首先', '然后', '最终', '步骤', '流程']):
    patterns.append('steps')
  
  return patterns

# ============ LLM 布局分析函数（新增）============

def analyze_single_slide_llm(
  slide: Dict[str, Any],
  page_num: int,
  total_pages: int,
  content_type: str,
  base_design: Dict[str, Any]
) -> Dict[str, Any]:
  """调用 LLM 分析单页布局（增强版，带页面类型约束）"""
  slide_title = slide.get("slide_title", "")
  slide_content = slide.get("slide_content", "") or slide.get("slide_subtitle", "")
  is_cover = slide.get("is_cover", False)
  
  # 推断页面类型
  page_type = "cover" if is_cover else ("summary" if page_num == total_pages else "content")
  
  prompt = LAYOUT_ANALYSIS_PROMPT.format(
    slide_title=slide_title,
    slide_content=slide_content[:500],
    page_num=page_num,
    total_pages=total_pages,
    content_type=content_type,
    page_type=page_type,
    primary_color=base_design.get("primary_color", "#8b5cf6"),
    accent_color=base_design.get("accent_color", "#14b8a6"),
    spacing=base_design.get("spacing", "normal"),
    decoration_count=base_design.get("decoration_count", 2)
  )
  
  try:
    llm = get_llm_client()
    response = llm.generate(prompt, max_tokens=350, temperature=0.2)
    
    response = response.strip()
    if response.startswith("```"):
      response = re.sub(r"^```json?\s*", "", response)
    if response.endswith("```"):
      response = re.sub(r"\s*```$", "", response)
    
    result = json.loads(response)
    
    # === 后处理：应用布局约束 ===
    # 1. 内容页强制左对齐
    if page_type == "content" and result.get("layout_hint") == "center_focus":
      result["layout_hint"] = "left_text_right_space"
    
    # 2. 内容页不标题强调
    if page_type == "content":
      result["title_emphasis"] = False
    
    # 3. 内容页不加 center_glow
    if page_type == "content" and "center_glow" in result.get("decoration_extra", []):
      result["decoration_extra"] = [d for d in result["decoration_extra"] if d != "center_glow"]
    
    # 验证必要字段
    for field in ["layout_hint", "special_elements", "spacing_override", "decoration_extra", "content_density", "title_emphasis"]:
      if field not in result:
        result[field] = {"layout_hint": "normal", "special_elements": [], "spacing_override": "normal", "decoration_extra": [], "content_density": "medium", "title_emphasis": False}.get(field, "normal")
    
    result["special_elements"] = list(result.get("special_elements", []))
    result["decoration_extra"] = list(result.get("decoration_extra", []))
    result["title_emphasis"] = bool(result.get("title_emphasis", False))
    
    print(f"    🤖 LLM: {page_type}→hint={result['layout_hint']}, elements={result['special_elements']}")
    return result
    
  except Exception as e:
    print(f"    ⚠️ LLM 失败，回退规则: {e}")
    return _fallback_layout_analysis(slide, is_cover)

def _fallback_layout_analysis(slide: Dict[str, Any], is_cover: bool) -> Dict[str, Any]:
  """规则兜底"""
  slide_content = slide.get("slide_content", "") or ""
  
  if is_cover:
    return {"layout_hint": "center_focus", "special_elements": ["quotes"], "spacing_override": "spacious", "decoration_extra": ["center_glow"], "content_density": "low", "title_emphasis": True}
  
  layout_hint = "left_text_right_space"
  special_elements = []
  
  if any(kw in slide_content for kw in ["对比", "vs", "优劣"]):
    layout_hint = "two_columns"
    special_elements.append("comparison")
  elif any(kw in slide_content for kw in ["首先", "然后", "步骤"]):
    layout_hint = "full_content"
    special_elements.append("steps")
  if re.search(r'\b\d{2,}%?', slide_content):
    special_elements.append("big_numbers")
  if any(kw in slide_content for kw in ['"', '"']):
    special_elements.append("quotes")
  
  return {"layout_hint": layout_hint, "special_elements": special_elements, "spacing_override": "normal", "decoration_extra": [], "content_density": "medium", "title_emphasis": False}

def enhance_all_slides_llm(slides: List[Dict[str, Any]], content_type: str, design: Dict[str, Any]) -> List[Dict[str, Any]]:
  """批量 LLM 分析（每页独立）"""
  print(f"\n🖼️  Step 4: LLM 增强 HTML 生成...")
  enhancements = []
  total = len(slides)
  
  for i, slide in enumerate(slides, 1):
    print(f"  分析第 {i}/{total} 页...")
    enhancement = analyze_single_slide_llm(slide, i, total, content_type, design)
    enhancements.append(enhancement)
  
  return enhancements

# ============ 设计参数提取 ============

def get_design_params(context: Dict[str, Any]) -> Dict[str, Any]:
  """从 context 中提取扁平化的设计参数"""
  dp = context.get("design_params", {})
  
  colors = dp.get("colors", {})
  typography = dp.get("typography", {})
  layout = dp.get("layout", {})
  
  primary = dp.get("primary_color") or dp.get("primary") or colors.get("primary") or "#8b5cf6"
  accent = dp.get("accent_color") or dp.get("accent") or colors.get("accent") or "#14b8a6"
  background = dp.get("background") or colors.get("background") or "#0a0a12"
  text_main = dp.get("text_main") or colors.get("text_main") or "#ffffff"
  text_secondary = dp.get("text_secondary") or colors.get("text_secondary") or "#94a3b8"
  
  title_typo = typography.get("title", {})
  heading_typo = typography.get("heading", {})
  subheading_typo = typography.get("subheading", {})
  body_typo = typography.get("body", {})
  
  return {
    "primary_color": primary,
    "accent_color": accent,
    "background": background,
    "text_main": text_main,
    "text_secondary": text_secondary,
    "title_font": title_typo.get("font", "Space Grotesk"),
    "title_size": f"{title_typo.get('size', 72)}px",
    "heading_size": f"{heading_typo.get('size', 52)}px",
    "subtitle_size": f"{subheading_typo.get('size', 32)}px",
    "body_size": f"{body_typo.get('size', 22)}px",
    "content_size": f"{body_typo.get('size', 22)}px",
    "max_width": layout.get("max_width", 1500),
    "spacing": layout.get("spacing", "normal"),
    "decoration_count": layout.get("decoration_count", 2),
    "title_mb": "30px",
    "additional_style": ""
  }

# ============ 样式映射函数 ============

def get_layout_style(enhancement: Dict[str, Any], base_style: Dict[str, Any]) -> Dict[str, str]:
  """根据 LLM 增强参数计算布局样式"""
  layout_hint = enhancement.get("layout_hint", "normal")
  spacing_override = enhancement.get("spacing_override", "normal")
  
  layout_alignments = {
    "center_focus": {"justify_content": "center", "align_items": "center", "text_align": "center"},
    "left_text_right_space": {"justify_content": "flex-start", "align_items": "flex-start", "text_align": "left"},
    "two_columns": {"justify_content": "flex-start", "align_items": "flex-start", "text_align": "left"},
    "minimal": {"justify_content": "center", "align_items": "center", "text_align": "center"},
    "full_content": {"justify_content": "flex-start", "align_items": "flex-start", "text_align": "left"},
    "normal": {"justify_content": "flex-start", "align_items": "flex-start", "text_align": "left"}
  }
  
  align = layout_alignments.get(layout_hint, layout_alignments["normal"])
  
  spacing_paddings = {
    "compact": {"padding": "40px 100px", "margin_multiplier": 0.6},
    "normal": {"padding": "80px 120px", "margin_multiplier": 1.0},
    "spacious": {"padding": "120px 160px", "margin_multiplier": 1.4}
  }
  
  spacing_cfg = spacing_paddings.get(spacing_override, spacing_paddings["normal"])
  
  content_density = enhancement.get("content_density", "medium")
  density_multiplier = {"low": 1.3, "medium": 1.0, "high": 0.7}.get(content_density, 1.0)
  
  padding_parts = spacing_cfg["padding"].split()
  v_pad = int(padding_parts[0].replace("px", ""))
  h_pad = int(padding_parts[1].replace("px", ""))
  
  adjusted_v_pad = int(v_pad * spacing_cfg["margin_multiplier"] * density_multiplier)
  adjusted_padding = f"{adjusted_v_pad}px {h_pad}px"
  
  return {
    "justify_content": align["justify_content"],
    "align_items": align["align_items"],
    "text_align": align["text_align"],
    "padding": adjusted_padding,
    "title_mb": f"{int(30 * spacing_cfg['margin_multiplier'])}px",
    "spacing": spacing_override
  }

def get_extra_decorations(enhancement: Dict[str, Any], primary_color: str) -> str:
  """生成装饰 HTML（带约束）"""
  decorations_html = []
  decoration_extra = enhancement.get("decoration_extra", [])
  layout_hint = enhancement.get("layout_hint", "normal")
  content_density = enhancement.get("content_density", "medium")
  
  # center_glow: 仅封面(center_focus) + low density
  if "center_glow" in decoration_extra and layout_hint == "center_focus" and content_density == "low":
    decorations_html.append(f'<div class="center-glow" style="background: radial-gradient(circle, {primary_color}33 0%, transparent 70%);"></div>')
  
  if "gradient_line" in decoration_extra:
    decorations_html.append('<div class="divider-gradient"></div>')
  
  if "corner_accent" in decoration_extra:
    decorations_html.append('<div class="corner-accent" style="top: 60px; right: 60px;"></div>')
  
  return "\n  ".join(decorations_html) if decorations_html else ""

def apply_markup_styling(text: str, design: Dict[str, Any], enhancement: Dict[str, Any]) -> str:
  """应用样式标记"""
  special_elements = enhancement.get("special_elements", [])
  
  if "big_numbers" in special_elements:
    def replace_number(match):
      return f'<span class="hl-number">{match.group(0)}</span>'
    text = re.sub(r'\b\d{2,}(?:\.\d+)?%?\b', replace_number, text)
  
  if "code_blocks" in special_elements:
    code_keywords = ['API', 'LLM', 'AI', 'Python', 'StepFun', 'Minimax', 'GPT', 'Claude', 'HTTP', 'REST', 'JSON']
    for kw in code_keywords:
      text = re.sub(rf'\b{re.escape(kw)}\b', rf'<code class="inline-code">{kw}</code>', text, flags=re.IGNORECASE)
  
  return text

# ============ HTML 模板 ============

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{slide_title}</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    
    body {{
      background: {background};
      color: #ffffff;
      font-family: "PingFang SC", "Space Grotesk", -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }}
    
    .bg-decoration {{
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.15;
      z-index: 0;
    }}
    .bg-1 {{ width: 500px; height: 500px; background: {primary_color}; top: -100px; left: -100px; }}
    .bg-2 {{ width: 400px; height: 400px; background: {accent_color}; bottom: -80px; right: -80px; }}
    
    .grid-texture {{
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
      z-index: -1;
    }}
    
    .center-glow {{
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 600px; height: 600px;
      background: radial-gradient(circle, {primary_color}22 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }}
    
    .corner-accent {{
      position: absolute;
      width: 120px; height: 120px;
      border: 3px solid {primary_color}66;
      border-radius: 0 0 0 100%;
      pointer-events: none;
    }}
    
    .divider-gradient {{
      width: 100%; height: 2px;
      background: linear-gradient(90deg, transparent, {primary_color}, transparent);
      margin: 20px auto;
      max-width: 1200px;
    }}
    
    .container {{
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: {max_width}px;
      padding: {padding};
      display: flex;
      flex-direction: column;
      align-items: {align_items};
      justify-content: {justify_content};
      text-align: {text_align};
    }}
    
    .title {{
      font-size: {title_size};
      font-weight: 700;
      color: #ffffff;
      margin-bottom: {title_mb};
      font-family: "Space Grotesk", sans-serif;
      line-height: 1.2;
      {title_style_extra}
    }}
    
    .subtitle {{
      font-size: {subtitle_size};
      color: {primary_color};
      margin-top: {subtitle_mt};
      font-weight: 500;
    }}
    
    .content {{
      font-size: {content_size};
      color: rgba(255,255,255,0.85);
      line-height: 1.7;
      max-width: 100%;
    }}
    
    .content p {{
      margin-bottom: 0.8em;
    }}
    
    .content p:last-child {{
      margin-bottom: 0;
    }}
    
    .hl-number {{
      color: {accent_color};
      font-weight: 700;
      font-size: 1.1em;
    }}
    
    .inline-code {{
      background: rgba(139,92,246,0.15);
      border: 1px solid rgba(139,92,246,0.3);
      border-radius: 4px;
      padding: 2px 6px;
      font-family: "SF Mono", Consolas, monospace;
      font-size: 0.85em;
      color: #c4b5fd;
    }}
    
    .two-columns {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      width: 100%;
      max-width: {max_width}px;
      margin: 16px auto;
    }}
    
    .column {{
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 20px;
    }}
    
    .placeholder {{
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.2);
      font-size: 0.8em;
    }}
    
    .big-number {{
      font-size: 3em;
      font-weight: 700;
      color: {accent_color};
      line-height: 1.2;
      margin: 8px 0;
    }}
    
    {additional_style}
  </style>
</head>
<body>
  <div class="bg-decoration bg-1"></div>
  <div class="bg-decoration bg-2"></div>
  <div class="grid-texture"></div>
  {extra_decorations}
  <div class="container">
    {content_html}
  </div>
</body>
</html>"""

# ============ 封面渲染（LLM 增强）============

def render_cover_llm(slide_title: str, slide_subtitle: str, base_design: Dict[str, Any], enhancement: Dict[str, Any]) -> str:
  """渲染封面页（LLM 增强）"""
  bg = base_design.get("background", "#0a0a12")
  primary = base_design.get("primary_color", "#8b5cf6")
  accent = base_design.get("accent_color", "#14b8a6")
  title_size = base_design.get("title_size", "72px")
  
  layout_style = get_layout_style(enhancement, base_design)
  extra_decorations = get_extra_decorations(enhancement, primary)
  
  content_html = f"<h1 class='title'>{slide_title}</h1>\n"
  if slide_subtitle:
    content_html += f"<p class='subtitle'>{slide_subtitle}</p>\n"
  
  return HTML_TEMPLATE.format(
    slide_title=slide_title,
    background=bg,
    primary_color=primary,
    accent_color=accent,
    title_size=title_size,
    title_mb=layout_style.get("title_mb", "30px"),
    subtitle_size="32px",
    subtitle_mt="20px",
    content_size="22px",
    text_align=layout_style["text_align"],
    padding=layout_style["padding"],
    max_width=base_design.get("max_width", 1500),
    justify_content=layout_style["justify_content"],
    align_items=layout_style["align_items"],
    additional_style=base_design.get("additional_style", ""),
    title_style_extra="",
    content_style_extra="",
    extra_decorations=extra_decorations,
    content_html=content_html
  )

# ============ 内容页渲染（LLM 增强）============

def render_content_llm(
  slide_title: str,
  slide_content: str,
  base_design: Dict[str, Any],
  enhancement: Dict[str, Any]
) -> str:
  """渲染内容页（LLM 增强版）"""
  bg = base_design.get("background", "#0a0a12")
  primary = base_design.get("primary_color", "#8b5cf6")
  accent = base_design.get("accent_color", "#14b8a6")
  title_size = base_design.get("heading_size", "48px")
  title_mb = base_design.get("title_mb", "30px")
  content_size = base_design.get("content_size", "22px")
  
  layout_style = get_layout_style(enhancement, base_design)
  extra_decorations = get_extra_decorations(enhancement, primary)
  
  bullets = [line.strip() for line in slide_content.split('\n') if line.strip().startswith('•')]
  
  content_html = f"<h1 class='title'>{slide_title}</h1>\n"
  content_html += "<div class='content'>\n"
  
  layout_hint = enhancement.get("layout_hint", "normal")
  
  if layout_hint == "two_columns" or "comparison" in enhancement.get("special_elements", []):
    pairs = []
    for i in range(0, len(bullets), 2):
      left = bullets[i] if i < len(bullets) else ''
      right = bullets[i+1] if i+1 < len(bullets) else ''
      pairs.append((left, right))
    
    content_html += '<div class="two-columns">\n'
    for left, right in pairs:
      content_html += '  <div class="column">\n'
      if left:
        text_left = left.lstrip('• ').strip()
        text_left = apply_markup_styling(text_left, base_design, enhancement)
        content_html += f'    <p>{text_left}</p>\n'
      if right:
        text_right = right.lstrip('• ').strip()
        text_right = apply_markup_styling(text_right, base_design, enhancement)
        content_html += f'    <p>{text_right}</p>\n'
      content_html += '  </div>\n'
    content_html += '</div>\n'
  
  elif layout_hint == "left_text_right_space":
    # 左文右空：每行左栏，右栏空白占位
    content_html += '<div class="two-columns" style="grid-template-columns: 1.2fr 0.8fr;">\n'
    for bullet in bullets:
      text = bullet.lstrip('• ').strip()
      text = apply_markup_styling(text, base_design, enhancement)
      content_html += '  <div class="column">\n'
      content_html += f'    <p>{text}</p>\n'
      content_html += '  </div>\n'
      content_html += '  <div class="column placeholder">\n'
      content_html += '    <!-- 预留图片位 -->\n'
      content_html += '  </div>\n'
    content_html += '</div>\n'
  
  elif layout_hint == "full_content" or "steps" in enhancement.get("special_elements", []):
    for bullet in bullets:
      text = bullet.lstrip('• ').strip()
      text = apply_markup_styling(text, base_design, enhancement)
      content_html += f"<p>{text}</p>\n"
  
  else:
    # 普通列表（内容页默认左对齐）
    for bullet in bullets:
      text = bullet.lstrip('• ').strip()
      text = apply_markup_styling(text, base_design, enhancement)
      content_html += f"<p>{text}</p>\n"
  
  content_html += "</div>\n"
  
  return HTML_TEMPLATE.format(
    slide_title=slide_title,
    background=bg,
    primary_color=primary,
    accent_color=accent,
    title_size=title_size,
    title_mb=title_mb,
    subtitle_size="0px",
    subtitle_mt="0",
    content_size=content_size,
    text_align=layout_style["text_align"],
    padding=layout_style["padding"],
    max_width=base_design.get("max_width", 1500),
    justify_content=layout_style["justify_content"],
    align_items=layout_style["align_items"],
    additional_style=base_design.get("additional_style", ""),
    title_style_extra="",
    content_style_extra="",
    extra_decorations=extra_decorations,
    content_html=content_html
  )

# ============ 主函数 ============

def step4_html(slides: List[Dict[str, Any]], context: Dict[str, Any]) -> List[Path]:
  """
  为每页 slide 生成 HTML（LLM 增强版）
  
  流程：
    1. 提取设计参数（从 context）
    2. LLM 分析所有 slides 的布局
    3. 根据 LLM 建议渲染 HTML
  """
  print("\n🎨 Step 4: HTML 渲染（LLM 增强版）...")
  
  design = get_design_params(context)
  content_type = context.get("content_type", "其他")
  
  print(f"  设计基础：primary={design['primary_color']}, accent={design['accent_color']}, spacing={design['spacing']}")
  
  # LLM 批量分析
  enhancements = enhance_all_slides_llm(slides, content_type, design)
  context["slide_enhancements"] = enhancements
  
  # 生成 HTML
  html_files = []
  
  for i, slide in enumerate(slides, 1):
    enhancement = enhancements[i-1]
    
    if slide.get("is_cover"):
      html = render_cover_llm(slide["slide_title"], slide.get("slide_subtitle", ""), design, enhancement)
    else:
      html = render_content_llm(slide["slide_title"], slide.get("slide_content", ""), design, enhancement)
    
    html_path = TEMP_DIR / f"slide-{i}.html"
    with open(html_path, 'w', encoding='utf-8') as f:
      f.write(html)
    html_files.append(html_path)
    print(f"  ✅ slide-{i}.html（hint={enhancement['layout_hint']}, elements={enhancement['special_elements']}）")
  
  context["html_files"] = html_files
  print(f"\n✅ Step 4 完成：共 {len(html_files)} 个 HTML 文件（LLM 增强）")
  return html_files

# ============ 旧版兼容函数（保留给 video-producer.py 调用）============

def generate_html_slide(page_index: int, key_point: str, script: str, design_params: Dict[str, Any], patterns: List[str], content_type: str) -> str:
  """旧版 generate_html_slide（兼容）"""
  # 构造 fake slide
  fake_slide = {
    "slide_title": key_point,
    "slide_content": f"• {script}",
    "is_cover": page_index == 1
  }
  fake_context = {"design_params": design_params, "content_type": content_type}
  fake_enhancement = {
    "layout_hint": "center_focus" if page_index == 1 else "left_text_right_space",
    "special_elements": patterns,
    "spacing_override": "normal",
    "decoration_extra": [],
    "content_density": "medium",
    "title_emphasis": page_index == 1
  }
  
  if page_index == 1:
    return render_cover_llm(key_point, script, get_design_params(fake_context), fake_enhancement)
  else:
    return render_content_llm(key_point, f"• {script}", get_design_params(fake_context), fake_enhancement)


if __name__ == "__main__":
  # 快速测试
  import sys
  sys.path.insert(0, '.')
  from step0_outline import step0_outline
  from step1_llm_slides import step1_llm_slides
  
  ctx = {}
  step0_outline("https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh", "auto", ctx)
  slides = step1_llm_slides(ctx.get('outline', {}), ctx.get('full_content', ''), ctx.get('content_type', ''), ctx)
  ctx["design_params"] = {"primary_color": "#2563eb", "accent_color": "#f59e0b", "layout": {"spacing": "normal", "decoration_count": 2}}
  
  html_files = step4_html(slides, ctx)
  for p in html_files:
    print(f"  {p}")
