#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')

from step0_outline import step0_outline
from step1_extract import step1_extract
import step1_5_refine
from step2_script import step2_script
from step3_design import step3_design
from step4_html import step4_html
from step5_tts import step5_tts
from step6_video import step6_video

doc_url = "https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh"
ctx = {}

print("\n" + "="*60)
print("VIDEO PRODUCER PIPELINE (step-1-8k)")
print("="*60)

# Step 0
print("\n[Step 0] Outline...")
r0 = step0_outline(doc_url, "executives", ctx)
outline = r0['outline']
print(f"  ✓ {outline['main_title']} | {len(outline['modules'])} modules")

# Step 1
print("\n[Step 1] Extract...")
r1 = step1_extract(ctx['full_content'], outline, ctx)
print(f"  ✓ Extracted")

# Step 1.5
print("\n[Step 1.5] Refine...")
r1_5 = step1_5_refine.refine_all_modules(ctx)
print(f"  ✓ {len(r1_5.get('refined_modules', []))} modules refined")

# Step 2
print("\n[Step 2] Scripts...")
slides = ctx['slides']  # Step 1.5 已生成
r2 = step2_script(slides, ctx)
print(f"  ✓ {len(ctx['scripts'])} scripts")

# Step 3
print("\n[Step 3] Design...")
r3 = step3_design(ctx)
print(f"  ✓ {r3.get('design_mode_used', 'optimized')} mode")

# Step 4
print("\n[Step 4] HTML...")
r4 = step4_html(ctx, r3)
print(f"  ✓ {r4.get('html_path', 'N/A')}")

# Step 5
print("\n[Step 5] TTS...")
try:
    r5 = step5_tts(ctx)
    print(f"  ✓ {r5.get('audio_dir', 'N/A')}")
except Exception as e:
    print(f"  ⚠️  {str(e)[:80]}")

# Step 6
print("\n[Step 6] Video...")
try:
    r6 = step6_video(ctx)
    print(f"  ✓ {r6.get('video_path', 'N/A')}")
except Exception as e:
    print(f"  ⚠️  {str(e)[:80]}")

print("\n" + "="*60)
print("STEPS 0-6 COMPLETE")
print("="*60)
