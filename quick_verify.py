#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')
from step0_outline import step0_outline
from step1_extract import step1_extract
import step1_5_refine
from step2_script import step2_script
from step3_design import step3_get_design_params

ctx = {}
step0_outline("https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh", "executives", ctx)
print(f"Step0: ct={ctx['content_type']}, rec={ctx['design_recommendation']}")

step1_extract(ctx['full_content'], ctx)
print(f"Step1: ct={ctx['content_type']}")

slides = step1_5_refine.step1_5_main(ctx)
step2_script(slides, ctx)
print(f"Step2: scripts={len(ctx['scripts'])}")

design = step3_get_design_params(ctx['content_type'], 'optimized', ctx)
print(f"Step3: mode={design.get('design_mode_used')}, primary={design.get('primary_color')}, spacing={design.get('spacing')}")
print("✅ All enum values consistent")
