#!/usr/bin/env python3
"""
Step 3: 确定视觉风格（内容感知微调版）

职责：
1. 从 context 读取 content_type、design_recommendation、full_content、outline
2. 根据 design_mode 获取基础参数
3. LLM 内容感知微调（refine_design_by_content）
4. 返回 design_params 并保存到 context

更新（2026-04-06）：
- 移除 audience_inferred 参数（不再需要）
- 设计参数由 LLM 基于全文内容微调
"""

import os
import json
from typing import Dict, Any

# 枚举值常量
CONTENT_TYPES = ["技术文档", "商业报告", "教学材料", "产品介绍", "品牌故事", "内部汇报", "其他"]
DESIGN_MODES = ["optimized", "default", "minimal"]

# ============ 基础参数获取 ============

def get_optimized_params(content_type: str) -> Dict[str, Any]:
  """optimized 模式参数（增强版）"""
  base = {
    "colors": {
      "background": "#0a0a12",
      "primary": "#8b5cf6",
      "accent": "#14b8a6",  # 青色强调
      "text_main": "#ffffff",
      "text_secondary": "#94a3b8"
    },
    "typography": {
      "title": {"size": 72, "font": "Space Grotesk", "weight": 700},
      "heading": {"size": 52, "font": "Space Grotesk", "weight": 700},
      "subheading": {"size": 32, "font": "Space Grotesk", "weight": 600},
      "body": {"size": 22, "font": "PingFang SC", "weight": 400, "line_height": 1.6},
      "code": {"size": 18, "font": "SF Mono, Consolas, monospace"}
    },
    "layout": {
      "max_width": 1500,
      "spacing": "normal",
      "decoration_count": 2
    },
    "special_elements": {
      "numbers": "xl",
      "code_styling": "enhanced",
      "quotes": "purple-left-border",
      "key_points": "callout-box"
    }
  }
  
  # 内容类型微调
  if content_type == "技术文档":
    base["layout"]["spacing"] = "compact"
  elif content_type == "商业报告":
    base["special_elements"]["kpi_cards"] = True
  elif content_type == "教学材料":
    base["special_elements"]["show_step_numbers"] = True
  
  return base

def get_default_params(content_type: str) -> Dict[str, Any]:
  """default 模式参数（基础版）"""
  return {
    "colors": {
      "background": "#0a0a12",
      "primary": "#8b5cf6",
      "accent": None,
      "text_main": "#ffffff",
      "text_secondary": "#94a3b8"
    },
    "typography": {
      "title": {"size": 60, "font": "Space Grotesk", "weight": 700},
      "heading": {"size": 48, "font": "Space Grotesk", "weight": 700},
      "subheading": {"size": 28, "font": "Space Grotesk", "weight": 600},  # 新增
      "body": {"size": 20, "font": "PingFang SC", "weight": 400, "line_height": 1.5},
      "code": {"size": 16, "font": "SF Mono, Consolas, monospace"}
    },
    "layout": {
      "max_width": 1400,
      "spacing": "normal",
      "decoration_count": 1
    },
    "special_elements": {}
  }

def get_minimal_params(content_type: str) -> Dict[str, Any]:
  """minimal 模式参数（极简）"""
  return {
    "colors": {
      "background": "#0a0a12",
      "primary": "#8b5cf6",
      "accent": None,
      "text_main": "#ffffff",
      "text_secondary": "#94a3b8"
    },
    "typography": {
      "title": {"size": 48, "font": "Space Grotesk", "weight": 700},
      "heading": {"size": 40, "font": "Space Grotesk", "weight": 600},
      "subheading": {"size": 24, "font": "Space Grotesk", "weight": 500},  # 新增
      "body": {"size": 18, "font": "PingFang SC", "weight": 400, "line_height": 1.4},
      "code": {"size": 16, "font": "SF Mono, Consolas, monospace"}
    },
    "layout": {
      "max_width": 1200,
      "spacing": "compact",
      "decoration_count": 0
    },
    "special_elements": {}
  }

# ============ 内容类型视觉风格 ============

def apply_content_type_style(params: Dict[str, Any], content_type: str) -> Dict[str, Any]:
  """应用内容类型的视觉风格（覆盖基础参数）"""
  
  if content_type == "技术文档":
    # 技术：深色背景，代码高亮，紧凑
    params["colors"]["background"] = "#0a0a12"
    params["colors"]["primary"] = "#8b5cf6"
    params["layout"]["spacing"] = "compact"
    params["special_elements"]["code_styling"] = "enhanced"
    
  elif content_type == "商业报告":
    # 商业：专业，数据突出
    params["colors"]["background"] = "#0a0a12"
    params["colors"]["primary"] = "#2563eb"  # 蓝色（专业）
    params["colors"]["accent"] = "#f59e0b"   # 橙色（数据高亮）
    params["special_elements"]["kpi_cards"] = True
    
  elif content_type == "教学材料":
    # 教学：友好，图解感
    params["colors"]["background"] = "#0a0a12"
    params["colors"]["primary"] = "#7c3aed"  # 紫色（创意）
    params["colors"]["accent"] = "#14b8a6"   # 青色（友好）
    params["special_elements"]["show_step_numbers"] = True
    
  elif content_type == "产品介绍":
    # 产品：品牌冲击，大留白
    params["colors"]["background"] = "linear-gradient(135deg, #0a0a12 0%, #1e1b4b 100%)"
    params["colors"]["primary"] = "#8b5cf6"
    params["layout"]["spacing"] = "spacious"
    params["special_elements"]["product_highlights"] = True
    
  elif content_type == "品牌故事":
    # 品牌：情感，暖色调
    params["colors"]["background"] = "linear-gradient(135deg, #1a0a0a 0%, #2e1010 100%)"
    params["colors"]["primary"] = "#f59e0b"   # 金色
    params["colors"]["accent"] = "#dc2626"    # 红色（激情）
    params["typography"]["title"]["font"] = "Georgia, serif"
    params["layout"]["spacing"] = "comfortable"
    
  elif content_type == "内部汇报":
    # 内部：高密度，信息优先
    params["colors"]["background"] = "#0a0a12"
    params["colors"]["primary"] = "#6b7280"   # 灰色（中性）
    params["layout"]["spacing"] = "compact"
    params["special_elements"]["content_density"] = "high"
    params["special_elements"]["show_checkboxes"] = True
  
  return params

# ============ LLM 内容感知微调 ============

def refine_design_by_content(base_params: Dict[str, Any], content_type: str, full_content: str, outline: Dict[str, Any]) -> Dict[str, Any]:
  """
  用 LLM 分析文档内容，微调设计参数
  
  输入：
    - base_params: 基础设计参数
    - content_type: 内容类型
    - full_content: 文档全文（前 3000 字符）
    - outline: 大纲（含 modules 数量）
  
  输出：
    - 微调后的 base_params（原地修改）
  
  LLM 分析维度：
    - accent_tone: 强调色情绪（vibrant/calm/urgent）
    - decoration_density: 装饰密度（low/medium/high）
    - layout_density: 布局密度（compact/normal/spacious）
    - highlight_numbers: 是否高亮数字（true/false）
  """
  
  content_sample = full_content[:3000] if full_content else ""
  modules_count = len(outline.get("modules", []))
  
  import re
  
  # 特征统计（减少 LLM 负担）
  number_count = len(re.findall(r'\d{2,}(?:\.\d+)?%?', content_sample))
  has_numbers = number_count >= 3
  
  code_keywords = ['API', 'code', '函数', '类', '架构', '系统', '算法', 'LLM', 'AI', '模型', '训练', '推理']
  code_mentions = sum(content_sample.lower().count(kw) for kw in code_keywords)
  has_code = code_mentions >= 2
  
  english_names = re.findall(r'[A-Z][a-z]+ [A-Z][a-z]+', content_sample)
  has_quotes = len(english_names) >= 2
  
  positive_words = ['突破', '创新', '成功', '增长', '收益', '机会', '优势', '领先']
  urgent_words = ['风险', '问题', '挑战', '必须', '紧急', '警示', '困难', '障碍']
  positive_count = sum(content_sample.count(w) for w in positive_words)
  urgent_count = sum(content_sample.count(w) for w in urgent_words)
  
  # 构建 LLM prompt
  prompt = f"""你是一位专业视觉设计师。分析以下演示文稿内容，推荐视觉参数优化。

【文档信息】
内容类型：{content_type}
设计模式：optimized
模块数：{modules_count}
全文采样：{len(content_sample)} 字符
数字出现：{number_count} 次
代码相关词：{code_mentions} 次
人物引用：{len(english_names) if 'english_names' in locals() else 'N/A'} 处
积极词汇：{positive_count} 个
警示词汇：{urgent_count} 个

【分析维度】
请基于以上数据，给出 JSON 格式建议：

1. accent_tone（强调色情绪）：
   - vibrant（活力）：数据增长、突破、积极向上 → 橙色 #f59e0b
   - calm（平和）：技术原理、客观陈述、系统架构 → 青色 #14b8a6
   - urgent（警示）：风险、问题、紧急行动 → 红色 #ef4444

2. decoration_density（装饰密度）：
   - low（0-1个）：简洁、高信息密度、技术细节
   - medium（1-2个）：平衡、适中
   - high（2-3个）：丰富、视觉冲击、产品展示

3. layout_density（布局密度）：
   - compact：内容短（<1500字）、要点多（>15个）、信息密集
   - normal：适中（默认）
   - spacious：内容长（>3000字）、留白多、高端感

4. highlight_numbers（是否高亮数字）：true / false

输出 JSON（仅 JSON，无其他文字）：
{{
  "accent_tone": "vibrant" | "calm" | "urgent",
  "decoration_density": "low" | "medium" | "high",
  "layout_density": "compact" | "normal" | "spacious",
  "highlight_numbers": true | false
}}"""

  try:
    from llm_client import LLMClient
    provider = os.environ.get('LLM_PROVIDER', 'stepfun')
    llm = LLMClient(provider=provider)
    response = llm.generate(prompt, max_tokens=300, temperature=0.2)
    
    # 解析 JSON
    json_str = response.strip()
    if json_str.startswith('```json'):
      json_str = json_str[7:]
    if json_str.startswith('```'):
      json_str = json_str[3:]
    if json_str.endswith('```'):
      json_str = json_str[:-3]
    json_str = json_str.strip()
    
    suggestions = None
    try:
      suggestions = json.loads(json_str)
    except Exception as e:
      print(f"  ⚠️  LLM JSON 解析失败: {e}")
      print(f"  Raw: {response[:200]}...")
      suggestions = None
    
    if suggestions and isinstance(suggestions, dict):
      # 应用 accent_tone
      accent_map = {
        "vibrant": "#f59e0b",
        "calm": "#14b8a6",
        "urgent": "#ef4444"
      }
      tone = suggestions.get("accent_tone")
      if tone in accent_map:
        base_params["colors"]["accent"] = accent_map[tone]
      
      # 应用 decoration_density
      decor_map = {"low": 0, "medium": 1, "high": 2}
      decor = suggestions.get("decoration_density", "medium")
      base_params["layout"]["decoration_count"] = decor_map.get(decor, 1)
      
      # 应用 layout_density
      spacing_map = {"compact": "compact", "normal": "normal", "spacious": "spacious"}
      density = suggestions.get("layout_density", "normal")
      base_params["layout"]["spacing"] = spacing_map.get(density, "normal")
      
      # 应用 highlight_numbers
      if suggestions.get("highlight_numbers") is not None:
        base_params["special_elements"]["highlight_numbers"] = suggestions["highlight_numbers"]
      
      # 记录 LLM 建议
      base_params["_llm_suggestions"] = suggestions
      base_params["source"] = base_params.get("source", "unknown") + "+llm-refined"
      
      print(f"  🎨 LLM 设计微调: accent={tone}, decor={decor}, spacing={density}, highlight={suggestions.get('highlight_numbers')}")
    
    else:
      # LLM 失败，使用规则 fallback
      print("  🔄 LLM 失败，使用规则 fallback")
      if has_numbers:
        base_params["special_elements"]["highlight_numbers"] = True
      if has_code:
        base_params["special_elements"]["code_styling"] = "enhanced"
      if urgent_count > positive_count:
        base_params["layout"]["decoration_count"] = 0
      elif positive_count > urgent_count:
        base_params["layout"]["decoration_count"] = 2
      if len(content_sample) < 1500:
        base_params["layout"]["spacing"] = "compact"
      elif len(content_sample) > 3000:
        base_params["layout"]["spacing"] = "spacious"
    
  except Exception as e:
    print(f"  ⚠️  LLM 设计微调失败，使用规则 fallback: {e}")
    if has_numbers:
      base_params["special_elements"]["highlight_numbers"] = True
    if urgent_count > positive_count:
      base_params["layout"]["decoration_count"] = 0
  
  return base_params

# ============ 主函数 ============

def step3_get_design_params(content_type: str, design_mode: str, context: Dict[str, Any]) -> Dict[str, Any]:
  """
  生成设计参数（三参数版本，无 audience_inferred）
  
  输入：
    - content_type: 内容类型
    - design_mode: 设计模式（default/optimized/minimal）
    - context: 全局上下文（包含 design_recommendation, full_content, outline）
  
  输出：
    - design_params: 设计参数字典
  
  流程：
    1. 自动应用 Step 0 推荐的 design_mode
    2. 获取基础参数（get_optimized_params 等）
    3. 应用内容类型视觉风格（apply_content_type_style）
    4. LLM 内容感知微调（refine_design_by_content）
    5. 扁平化输出（flatten）
    6. 保存到 context["design_params"]
  """
  
  # 1. 自动应用 Step 0 推荐
  design_recommendation = context.get("design_recommendation", "optimized")
  if design_mode == "optimized" and design_recommendation in ("default", "minimal"):
    design_mode = design_recommendation
  
  # 2. 获取基础参数
  if design_mode == "optimized":
    base_params = get_optimized_params(content_type)
    base_params["source"] = "builtin-optimized"
  elif design_mode == "default":
    base_params = get_default_params(content_type)
    base_params["source"] = "builtin-default"
  elif design_mode == "minimal":
    base_params = get_minimal_params(content_type)
    base_params["source"] = "builtin-minimal"
  else:
    raise ValueError(f"Unknown design_mode: {design_mode}")
  
  # 3. 应用内容类型视觉风格
  base_params = apply_content_type_style(base_params, content_type)
  
  # 4. LLM 内容感知微调
  full_content = context.get("full_content", "")
  outline = context.get("outline", {})
  base_params = refine_design_by_content(base_params, content_type, full_content, outline)
  
  # 5. 扁平化输出（供 Step 4 使用）
  flat = {
    "colors": base_params["colors"],
    "typography": base_params["typography"],
    "layout": base_params["layout"],
    "special_elements": base_params["special_elements"],
    # 顶层别名
    "primary_color": base_params["colors"].get("primary") or base_params.get("primary"),
    "accent_color": base_params["colors"].get("accent") or base_params.get("accent"),
    "background": base_params["colors"].get("background") or base_params.get("background"),
    "text_main": base_params["colors"].get("text_main") or "#ffffff",
    "text_secondary": base_params["colors"].get("text_secondary") or "#94a3b8",
    "title_size": f"{base_params['typography']['title']['size']}px",
    "heading_size": f"{base_params['typography']['heading']['size']}px",
    "subtitle_size": f"{base_params['typography']['subheading']['size']}px",
    "body_size": f"{base_params['typography']['body']['size']}px",
    "content_size": f"{base_params['typography']['body']['size']}px",
    "title_font": base_params['typography']['title'].get('font', 'Space Grotesk'),
    "body_font": base_params['typography']['body'].get('font', 'PingFang SC'),
    "spacing": base_params['layout'].get('spacing', 'normal'),
    "decoration_count": base_params['layout'].get('decoration_count', 2),
    "max_width": base_params['layout'].get('max_width', 1500),
    # 特殊元素标记
    "has_code_styling": base_params['special_elements'].get('code_styling') == 'enhanced',
    "has_kpi_cards": base_params['special_elements'].get('kpi_cards', False),
    "has_diagrams": base_params['special_elements'].get('show_arch_diagram', False),
    "content_density": base_params['layout'].get('spacing', 'normal'),
  }
  
  # 6. 记录元数据
  flat["design_mode_used"] = design_mode
  if design_mode != design_recommendation:
    flat["design_recommendation_override"] = design_recommendation
  flat["source"] = base_params.get("source", "unknown")
  if "_llm_suggestions" in base_params:
    flat["_llm_suggestions"] = base_params["_llm_suggestions"]
  
  # 7. 保存到 context
  context["design_params"] = flat
  
  return flat

if __name__ == "__main__":
  # 测试
  ctx = {
    "content_type": "技术文档",
    "design_recommendation": "minimal",
    "full_content": "测试内容" * 100,
    "outline": {"modules": [{"id": 1, "title": "测试"}]}
  }
  params = step3_get_design_params("技术文档", "optimized", ctx)
  print("Step 3 输出设计参数:")
  print(json.dumps(params, indent=2, ensure_ascii=False))
