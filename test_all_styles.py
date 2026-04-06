#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')
from step3_design import step3_get_design_params

types = ["技术文档", "商业报告", "教学材料", "产品介绍"]
for ct in types:
  ctx = {"content_type": ct, "design_recommendation": "optimized"}
  params = step3_get_design_params(ct, "optimized", ctx)
  print(f"\n=== {ct} ===")
  print(f"  Primary: {params.get('primary_color')}")
  print(f"  Accent: {params.get('accent_color')}")
  print(f"  Title: {params.get('title_size')}")
  print(f"  Body: {params.get('body_size')} font: {params.get('body_font')[:30] if params.get('body_font') else 'N/A'}")
  raw = params.get('_raw', {})
  print(f"  Spacing: {raw.get('layout', {}).get('spacing')}")
  print(f"  Decoration: {raw.get('layout', {}).get('decoration_count')}")
