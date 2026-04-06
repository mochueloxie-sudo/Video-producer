#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')

from step0_outline import step0_outline
from step1_llm_slides import step1_llm_slides  # LLM 生成 slides (Step 1-1.5)
from step2_llm_scripts import step2_llm_scripts  # LLM 生成逐字稿 (Step 2)
from step3_design import step3_get_design_params
from step4_html import step4_html
from step5_tts import step5_tts
from step6_video import step6_video

doc_url = "https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh"
ctx = {}

print("\n" + "="*60)
print("VIDEO PRODUCER PIPELINE (LLM-driven Step 1-2)")
print("="*60)

# Step 0: 大纲（LLM）
print("\n[Step 0] Outline (LLM)...")
r0 = step0_outline(doc_url, "auto", ctx)
outline = r0['outline']
print(f"  ✓ {outline['main_title']} | {len(outline['modules'])} modules")
print(f"  Type: {ctx['content_type']}, Design: {ctx['design_recommendation']}")

# Step 1-1.5: Slides 生成（LLM）
print("\n[Step 1-1.5] Slides generation (LLM)...")
slides = step1_llm_slides(outline, ctx['full_content'], ctx['content_type'], ctx)
print(f"  ✓ {len(slides)} slides (1 cover + {len(slides)-1} content)")

# Step 2: 逐字稿生成（LLM）
print("\n[Step 2] Narrator scripts (LLM)...")
scripts = step2_llm_scripts(slides, ctx['full_content'], ctx['content_type'], ctx)
print(f"  ✓ {len(scripts)} scripts generated")

# Step 3: 视觉参数（规则）
print("\n[Step 3] Design params...")
design = step3_get_design_params(ctx['content_type'], ctx['design_recommendation'], ctx)
print(f"  ✓ Mode: {design.get('design_mode_used', 'N/A')}, Primary: {design.get('primary_color')}")

# Step 4: HTML 渲染（规则）
print("\n[Step 4] HTML rendering...")
html_files = step4_html(slides, ctx)
print(f"  ✓ {len(html_files)} HTML files")

# Step 5: TTS（规则）
print("\n[Step 5] TTS voiceover...")
try:
    audio_files = step5_tts(scripts, ctx)
    print(f"  ✓ {len(audio_files)} audio files")
except Exception as e:
    print(f"  ⚠️  {str(e)[:80]}")
    audio_files = []

# Step 6: Video（规则）
print("\n[Step 6] Video composition...")
try:
    video_path = step6_video(html_files, audio_files, ctx)
    print(f"  ✓ {video_path}")
except Exception as e:
    print(f"  ⚠️  {str(e)[:80]}")

print("\n" + "="*60)
print("PIPELINE STEPS 0-6 DONE")
print("="*60)
if len(scripts) >= 2:
  print("\n📝 Scripts preview:")
  print(f"  Cover ({len(scripts[0])}chars): {scripts[0][:80]}...")
  print(f"  Page 2 ({len(scripts[1])}chars): {scripts[1][:80]}...")
