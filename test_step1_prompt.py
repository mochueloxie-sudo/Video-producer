#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')

from step0_outline import step0_outline
from step1_llm_slides import step1_llm_slides, build_slides_prompt

ctx = {}
step0_outline("https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh", "auto", ctx)

outline = ctx['outline']
print(f"Title: {outline['main_title']}")
print(f"Modules: {len(outline['modules'])}")

# 只构建 prompt，不调用 LLM
prompt = build_slides_prompt(
  outline['main_title'],
  outline['main_subtitle'],
  outline['modules'],
  ctx['full_content'],
  ctx['content_type']
)

print("\n=== LLM Prompt (first 1000 chars) ===")
print(prompt[:1000])
print("...")
print(f"\nPrompt total length: {len(prompt)} chars")
