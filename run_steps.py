#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')

from step0_outline import step0_outline
from step1_extract import step1_extract
import step1_5_refine
from step2_script import step2_script
from step3_design import step3_design
from step4_html import step4_html

doc_url = "https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh"
ctx = {}

print("\n=== VIDEO PRODUCER PIPELINE (step-1-8k) ===\n")

# Step 0
print("[Step 0] Outline...")
r0 = step0_outline(doc_url, "executives", ctx)
outline = r0['outline']
print(f"  Title: {outline['main_title']}")
print(f"  Modules: {len(outline['modules'])}")

# Step 1
print("\n[Step 1] Extract...")
r1 = step1_extract(ctx['full_content'], outline, ctx)
print(f"  OK")

# Step 1.5
print("\n[Step 1.5] Refine...")
r1_5 = step1_5_refine.refine_all_modules(ctx)
print(f"  OK: {len(r1_5.get('refined_modules', []))} modules")

# Step 2
print("\n[Step 2] Scripts...")
r2 = step2_script(ctx, "executives")
print(f"  OK: {len(r2.get('narrator_script', []))} segments")

# Step 3
print("\n[Step 3] Design...")
r3 = step3_design(ctx, "executives")
print(f"  OK")

# Step 4
print("\n[Step 4] HTML...")
r4 = step4_html(ctx, r3.get('design', {}), "executives")
print(f"  OK: {r4.get('html_path', 'N/A')}")

print("\n=== STEPS 0-4 DONE ===")
