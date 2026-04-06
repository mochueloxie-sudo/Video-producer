#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/teeclaw/.openclaw/workspace/video-producer/steps')
from step3_design import step3_get_design_params

ctx = {
  "content_type": "商业报告",
  "design_recommendation": "optimized"
}
params = step3_get_design_params("商业报告", "optimized", ctx)
print("=== 设计参数 ===")
import json
print(json.dumps(params, indent=2, ensure_ascii=False))
