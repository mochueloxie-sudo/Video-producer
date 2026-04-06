#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')
from step3_design import step3_get_design_params

ctx = {"content_type": "技术文档", "design_recommendation": "optimized"}
params = step3_get_design_params("技术文档", "optimized", ctx)
print("=== 技术文档视觉风格 ===")
print("Background:", params.get('background'))
print("Primary:", params.get('primary_color'))
print("Accent:", params.get('accent_color'))
print("Title size:", params.get('title_size'))
print("Body size:", params.get('body_size'))
print("Body font:", params.get('_raw', {}).get('typography', {}).get('body', {}).get('font'))
print("Code styling:", params.get('_raw', {}).get('special_elements', {}).get('code_styling'))
print("Layout spacing:", params.get('_raw', {}).get('layout', {}).get('spacing'))
