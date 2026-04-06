#!/usr/bin/env python3
"""
video-producer - 将任意文档转化为视频演示稿（重构版）

新流程：
  Step 0 (outline) → Step 1.5 (refine) → Step 2 (script) → Step 3 (design) → Step 4 (HTML) → Step 5 (TTS) → Step 6 (video) → Step 7 (doc)

变更：
  - Step 0 输出 outline（主标题、副标题、模块列表）
  - 新增 Step 1.5 生成 slides（封面 + 内容页精炼）
  - Step 2 基于 slides 生成逐字稿
  - Step 4 基于 slides 生成 HTML
"""

import argparse
import sys
from pathlib import Path

# 添加 steps 目录到路径
sys.path.insert(0, str(Path(__file__).parent / "steps"))

# 全局上下文
context = {}

def parse_args():
  parser = argparse.ArgumentParser(description="将文档转化为视频演示稿（重构版）")
  parser.add_argument("--document_url", type=str, required=True, help="文档地址")
  parser.add_argument("--audience", type=str, default="auto", help="目标受众：auto/general/students/executives/developers/internal")
  parser.add_argument("--design_mode", type=str, default="optimized", help="设计模式：default/optimized/minimal")
  parser.add_argument("--tts_provider", type=str, default="minimax", help="TTS 提供商：say/minimax/tencent")
  parser.add_argument("--output_quality", type=str, default="high", help="输出质量：high/medium/low")
  return parser.parse_args()

def main():
  args = parse_args()

  print("=" * 60)
  print("🎬 video-producer 开始执行（重构版）")
  print("=" * 60)
  print(f"  文档: {args.document_url}")
  print(f"  受众: {args.audience}")
  print(f"  设计模式: {args.design_mode}")
  print(f"  TTS: {args.tts_provider}")
  print(f"  质量: {args.output_quality}")
  print("=" * 60)

  # === Step 0: 结构化梗概生成 ===
  print("\n🔍 Step 0: 内容分析 + 结构化梗概...")
  from step0_outline import step0_outline
  result = step0_outline(args.document_url, args.audience, context)
  print(f"  内容类型: {result['content_type']}")
  print(f"  推荐设计: {result['design_recommendation']}")
  print(f"  主标题: {result['outline']['main_title']}")
  print(f"  模块数: {len(result['outline']['modules'])}")

  # === Step 1.5: 页面内容精炼 ===
  print("\n🎨 Step 1.5: 页面内容精炼...")
  from step1_5_refine import step1_5_main
  slides = step1_5_main(context)
  print(f"  生成 {len(slides)} 页（1 封面 + {len(slides)-1} 内容页）")

  # === Step 2: 逐字稿生成 ===
  print("\n🎤 Step 2: 逐字稿生成...")
  from step2_script import step2_script
  scripts = step2_script(slides, context)
  print(f"  生成 {len(scripts)} 条逐字稿")
  print(f"  第1页长度: {len(scripts[0])} 字")

  # === Step 3: 视觉风格确定 ===
  print("\n🎨 Step 3: 确定视觉风格...")
  from step3_design import step3_get_design_params
  design_params = step3_get_design_params(
    result['content_type'],
    args.design_mode,
    context
  )
  print(f"  设计模式: {design_params.get('design_mode_used', args.design_mode)}")
  print(f"  主色调: {design_params.get('primary_color', '#2563eb')}")

  # === Step 4: HTML 渲染 ===
  print("\n🖼️  Step 4: HTML 渲染...")
  from step4_html import step4_html
  html_files = step4_html(slides, context)
  print(f"  生成 {len(html_files)} 个 HTML 文件")

  # === Step 5: TTS 音频生成 ===
  print("\n🔊 Step 5: TTS 音频生成...")
  from step5_tts import step5_tts
  audio_files = step5_tts(scripts, context)
  print(f"  生成 {len(audio_files)} 个音频文件")

  # === Step 6: 视频合成 ===
  print("\n🎬 Step 6: 视频合成...")
  from step6_video import step6_video
  video_path = step6_video(html_files, audio_files, context)
  print(f"  视频输出: {video_path}")

  # === Step 7: 飞书文档创建 ===
  print("\n📄 Step 7: 创建飞书文档...")
  from step7_doc import step7_doc
  
  # 从 slides 提取 key_points（页面标题列表）
  key_points = [s["slide_title"] for s in slides]
  
  # 上传视频（step6 已返回 video_path，这里再获取 token）
  video_token = context.get("video_token")
  if not video_token:
    # 如果 step6 未上传，则现在上传
    from step7_doc import upload_video_to_feishu
    video_token = upload_video_to_feishu(str(video_path), context)
  
  doc_url = step7_doc(key_points, scripts, video_token, context)
  print(f"  飞书文档: {doc_url}")

  print("\n" + "=" * 60)
  print("✅ 全部完成！")
  print(f"  视频: {video_path}")
  print("=" * 60)

if __name__ == "__main__":
  main()
