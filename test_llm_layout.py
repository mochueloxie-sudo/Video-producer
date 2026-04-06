#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""最小测试：只测 Step 4 的 LLM 布局分析功能"""

import os
import sys
from pathlib import Path

os.environ['LLM_PROVIDER'] = 'stepfun'
os.environ['STEPFUN_API_KEY'] = '1Jj2goyzxAxUp2uUjbHiimFk5dbjabksIvM2Ebh0OZhW5HihlaH2An9y4NRNh5GC2'

sys.path.insert(0, str(Path(__file__).parent / "steps"))

from step4_html import analyze_single_slide_llm, get_design_params

# 模拟一个 content_type 和 base_design
content_type = "商业报告"
base_design = {
  "primary_color": "#8b5cf6",
  "accent_color": "#14b8a6",
  "spacing": "normal",
  "decoration_count": 2
}

# 测试 slide
test_slide = {
  "slide_title": "Liam Fedus 用 AI 革命材料科学",
  "slide_content": "• 2倍增长：AI 驱动的材料发现速度提升 2 倍\n• 80年目标：80 年内解决能源问题\n• 核心观点：软件将变得无限供应",
  "is_cover": False
}

print("🧪 测试 LLM 单页布局分析...")
print(f"页标题: {test_slide['slide_title']}")
print(f"页内容: {test_slide['slide_content'][:60]}...")

result = analyze_single_slide_llm(
  test_slide,
  page_num=1,
  total_pages=5,
  content_type=content_type,
  base_design=base_design
)

print(f"\n✅ LLM 分析结果:")
print(f"  layout_hint: {result['layout_hint']}")
print(f"  special_elements: {result['special_elements']}")
print(f"  spacing_override: {result['spacing_override']}")
print(f"  decoration_extra: {result['decoration_extra']}")
print(f"  content_density: {result['content_density']}")
print(f"  title_emphasis: {result['title_emphasis']}")
