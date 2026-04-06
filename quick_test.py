#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')
from step0_outline import step0_outline

ctx = {}
result = step0_outline(
    "https://hyov0x2p7i.feishu.cn/docx/G7kqdTgJVoTXtxxNrXFcFXeLnUh",
    "executives",
    ctx
)
print("\n✅ Step 0 SUCCESS")
print(f"Title: {result['outline']['main_title']}")
print(f"Modules: {len(result['outline']['modules'])}")
