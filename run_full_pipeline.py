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
from step7_doc import step7_doc

doc_url = "https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh"
ctx = {}

print("\n" + "="*60)
print("VIDEO PRODUCER FULL PIPELINE (step-1-8k)")
print("="*60)

# Step 0
print("\n[Step 0] Content analysis + outline...")
r0 = step0_outline(doc_url, "executives", ctx)
outline = r0['outline']
print(f"  ✓ Title: {outline['main_title']}")
print(f"  ✓ {len(outline['modules'])} modules")

# Step 1
print("\n[Step 1] Extract module content...")
r1 = step1_extract(ctx['full_content'], outline, ctx)
print(f"  ✓ Extracted")

# Step 1.5
print("\n[Step 1.5] Refine scripts...")
r1_5 = step1_5_refine.refine_all_modules(ctx)
refined = r1_5.get('refined_modules', [])
print(f"  ✓ {len(refined)} refined modules")

# Step 2
print("\n[Step 2] Narrator scripts...")
r2 = step2_script(ctx, "executives")
scripts = r2.get('narrator_script', [])
print(f"  ✓ {len(scripts)} script segments")

# Step 3
print("\n[Step 3] Design params...")
r3 = step3_design(ctx, "executives")
design = r3.get('design', {})
print(f"  ✓ Design mode: {design.get('mode', 'N/A')}")

# Step 4
print("\n[Step 4] Generate HTML...")
r4 = step4_html(ctx, design, "executives")
html = r4.get('html_path', 'N/A')
print(f"  ✓ HTML: {html}")

# Step 5 (may skip)
print("\n[Step 5] TTS voiceover...")
try:
    r5 = step5_tts(ctx, "executives")
    audio = r5.get('audio_dir', 'N/A')
    print(f"  ✓ Audio: {audio}")
except Exception as e:
    print(f"  ⚠️  Skipped: {str(e)[:60]}")

# Step 6 (may skip)
print("\n[Step 6] Video composition...")
try:
    r6 = step6_video(ctx, "executives")
    video = r6.get('video_path', 'N/A')
    print(f"  ✓ Video: {video}")
except Exception as e:
    print(f"  ⚠️  Skipped: {str(e)[:60]}")

# Step 7
print("\n[Step 7] Feishu doc...")
try:
    r7 = step7_doc(ctx, "executives")
    doc = r7.get('url', 'N/A')
    print(f"  ✓ Doc: {doc}")
except Exception as e:
    print(f"  ⚠️  Skipped: {str(e)[:60]}")

print("\n" + "="*60)
print("PIPELINE COMPLETE")
print("="*60)
print(f"\nContext keys: {list(ctx.keys())}")
