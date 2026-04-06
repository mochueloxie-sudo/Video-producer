#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')
from step3_design import step3_get_design_params
ctx = {"content_type": "商业报告", "design_recommendation": "optimized"}
params = step3_get_design_params("商业报告", "optimized", ctx)
print("=== 扁平化设计参数 ===")
import json
print("background:", params.get('background'))
print("primary_color:", params.get('primary_color'))
print("accent_color:", params.get('accent_color'))
print("title_size:", params.get('title_size'))
print("body_size:", params.get('body_size'))
