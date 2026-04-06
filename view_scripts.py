#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')
from step0_outline import step0_outline
from step1_5_refine import step1_5_main
from step2_script import step2_script

ctx = {}
step0_outline("https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh", "executives", ctx)
slides = step1_5_main(ctx)
scripts = step2_script(slides, ctx)

print("\n=== 逐字稿详情 ===")
for i, s in enumerate(scripts, 1):
  print(f"\n--- 第{i}页 ({len(s)}字) ---")
  print(s)
