#!/usr/bin/env python3
"""Test Step 0 + Step 1.5 (core LLM steps)"""
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')

from step0_outline import step0_outline
import step1_5_refine

doc_url = "https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh"

print("=== Testing Step 0 + Step 1.5 ===\n")

# Step 0
ctx = {}
print("[Step 0] Running...")
r0 = step0_outline(doc_url, "executives", ctx)
outline = r0['outline']
print(f"  Title: {outline['main_title']}")
print(f"  Modules: {len(outline['modules'])}")

# Step 1.5: Refine first module title
print("\n[Step 1.5] Refining first module...")
first_mod = outline['modules'][0]
original_title = first_mod['title']
key_points = first_mod['key_points']

refined = step1_5_refine.refine_title(original_title, key_points, "")
print(f"  Original: {original_title}")
print(f"  Refined : {refined}")

print("\n✅ Core LLM steps working!")
