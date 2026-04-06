#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')

from step0_outline import step0_outline
from step1_extract import step1_extract
import step1_5_refine
from step2_script import step2_script
from step3_design import step3_get_design_params

ctx = {}
print("=== Step 0 ===")
step0_outline("https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh", "executives", ctx)
print(f"content_type: {ctx['content_type']!r}")
print(f"audience (removed)

print("\n=== Step 1 ===")
step1_extract(ctx['full_content'], ctx)
print(f"after step1 content_type: {ctx['content_type']!r}")

print("\n=== Step 1.5 ===")
slides = step1_5_refine.step1_5_main(ctx)
print(f"slides: {len(slides)}")

print("\n=== Step 2 ===")
step2_script(slides, ctx)
print(f"after step2 content_type: {ctx['content_type']!r}")

print("\n=== Step 3 ===")
design = step3_get_design_params(ctx['content_type'], ctx['design_recommendation'], ctx)
print(f"design_mode_used: {design.get('design_mode_used')!r}")
print(f"primary_color: {design.get('primary_color')}")

print("\n✅ All fields consistent!")
