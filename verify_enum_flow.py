#!/usr/bin/env python3
"""验证 Step 0-3 的枚举值完整性和一致性"""
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')

from step0_outline import step0_outline
from step1_extract import step1_extract
import step1_5_refine
from step2_script import step2_script
from step3_design import step3_get_design_params

# 测试用例：不同内容类型 + 受众组合
test_cases = [
    ("技术文档", "developers"),
    ("商业报告", "executives"),
    ("教学材料", "students"),
    ("产品介绍", "general"),
    ("品牌故事", "general"),
    ("内部汇报", "internal"),
]

print("=== 枚举值一致性验证 ===\n")

for content_type, audience in test_cases:
  print(f"\n--- 测试: {content_type} × {audience} ---")
  
  ctx = {}
  # Step 0（使用 audience hint）
  step0_outline(
      "https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh",
      audience,
      ctx
  )
  
  print(f"  Step 0 → content_type={ctx['content_type']!r}, audience (removed), design_rec={ctx['design_recommendation']!r}")
  
  # Step 1
  step1_extract(ctx['full_content'], ctx)
  print(f"  Step 1 → content_type still={ctx['content_type']!r}")
  
  # Step 1.5
  slides = step1_5_refine.step1_5_main(ctx)
  
  # Step 2
  step2_script(slides, ctx)
  print(f"  Step 2 → scripts: {len(ctx['scripts'])}")
  
  # Step 3
  design = step3_get_design_params(
      ctx['content_type'],
      "optimized",
      ctx
  )
  print(f"  Step 3 → mode={design.get('design_mode_used')!r}, primary={design.get('primary_color')}, spacing={design.get('spacing')}")
  
  # 检查设计参数是否匹配预期
  expected_primary = {
      "技术文档": "#3b82f6",
      "商业报告": "#8b5cf6",
      "教学材料": "#3b82f6",
      "产品介绍": "#ffffff",
      "品牌故事": "#f59e0b",
      "内部汇报": "#6b7280"}.get(content_type, "#8b5cf6")
  
  if design.get('primary_color') != expected_primary:
      print(f"  ⚠️  主色不匹配: 实际={design.get('primary_color')}, 预期={expected_primary}")
  else:
      print(f"  ✅ 视觉风格匹配 {content_type}")

print("\n=== 验证完成 ===")
