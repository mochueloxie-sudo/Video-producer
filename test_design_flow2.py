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
step0_outline('https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh', 'executives', ctx)
print('Title:', ctx['outline']['main_title'])
step1_extract(ctx['full_content'], ctx)
step1_5_refine.step1_5_main(ctx)
step2_script(ctx.get('slides', []), ctx)
design = step3_get_design_params(ctx['content_type'], 'optimized', ctx)
print('\n=== Design Params ===')
print('Mode:', design.get('design_mode_used'))
print('Bg:', design.get('background')[:60])
print('Colors: primary={primary_color}, accent={accent_color}'.format(**design))
# Step 4 接收 context（内含 design_params）
html_files = step4_html(ctx.get('slides', []), ctx)
print('\nHTML files:', len(html_files))
if html_files:
  print('Sample:', html_files[0])
