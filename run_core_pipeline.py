#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')

from step0_outline import step0_outline
from step1_extract import step1_extract
import step1_5_refine
from step2_script import step2_script
from step3_design import step3_get_design_params
from step4_html import step4_html

ctx = {}
print("=== Pipeline 验证（无 audience）===\n")

# Step 0
print("Step 0: outline...")
step0_outline("https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh", "auto", ctx)
print(f"  content_type: {ctx['content_type']}")
print(f"  design_recommendation: {ctx['design_recommendation']}")
# print(f"  audience: {ctx.get('audience_inferred', 'N/A')}")  # 已删除

# Step 1
print("\nStep 1: extract...")
step1_extract(ctx['full_content'], ctx)
print(f"  key_points: {len(ctx['key_points'])}")

# Step 1.5
print("\nStep 1.5: refine...")
slides = step1_5_refine.step1_5_main(ctx)
print(f"  slides: {len(slides)}")

# Step 2
print("\nStep 2: scripts...")
step2_script(slides, ctx)
print(f"  scripts: {len(ctx['scripts'])}")

# Step 3
print("\nStep 3: design...")
design = step3_get_design_params(ctx['content_type'], 'optimized', ctx)
print(f"  mode: {design.get('design_mode_used')}")
print(f"  primary: {design.get('primary_color')}")

# Step 4
print("\nStep 4: HTML...")
html_files = step4_html(slides, ctx)
print(f"  ✓ {len(html_files)} slides")

print("\n✅ Pipeline 核心流程验证通过（Step 0-4）")
print("  注意：Step 5-7 需要 TTS/ffmpeg/飞书权限，暂不自动执行")
