"""
Step 6: ffmpeg 视频合成

职责：
1. 为每页生成截图（如果 PNG 不存在）
2. 将 HTML → PNG（使用 Puppeteer）
3. 合成视频：每页音频时长，1920x1080，H.264 + AAC
"""

import subprocess
import json
from pathlib import Path
from typing import List, Dict, Any

# 加载配置（获取路径）
def load_config() -> Dict[str, Any]:
  config_path = Path("/Users/teeclaw/.openclaw/workspace/video-producer/config.json")
  if config_path.exists():
    with open(config_path) as f:
      cfg = json.load(f)
      if "paths" in cfg:
        cfg.update(cfg["paths"])
      return cfg
  return {}

CONFIG = load_config()

# 路径定义（从 config 读取，回退到硬编码）
SLIDES_DIR = Path("/tmp/video-producer-slides")
AUDIO_DIR = Path("/tmp/video-producer-audio")
OUTPUT_DIR = Path("/tmp/video-producer-output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

FFMPEG = CONFIG.get("ffmpeg", "/Users/teeclaw/bin/ffmpeg")
NODE_PATH = CONFIG.get("node", "/Users/teeclaw/.local/node-stable/node-v24.4.1-darwin-arm64/bin/node")
PUPPETEER_SCRIPT = Path(__file__).parent / "tools" / "screenshot.js"


def ensure_screenshots(html_files: List[str]) -> List[str]:
  """确保每页 HTML 都有有效的 PNG 截图（调用 Puppeteer）"""
  MIN_SIZE = 50 * 1024  # 50KB，小于此视为占位/损坏
  need_screenshot = []

  for html in html_files:
    png = str(html).replace('.html', '.png')
    if not Path(png).exists() or Path(png).stat().st_size < MIN_SIZE:
      need_screenshot.append(html)

  if not need_screenshot:
    return [str(html).replace('.html', '.png') for html in html_files]

  print(f"  需要截图 {len(need_screenshot)} 页（检测到占位图或缺失）...")

  cmd = [NODE_PATH, str(PUPPETEER_SCRIPT)] + need_screenshot
  result = subprocess.run(cmd, capture_output=True, text=True, timeout=60, cwd="/Users/teeclaw/.openclaw/workspace/video-producer")
  if result.returncode == 0:
    print(f"  ✅ 截图完成")
  else:
    print(f"  ⚠️  截图失败: {result.stderr[:100]}")

  png_files = []
  for html in html_files:
    png = str(html).replace('.html', '.png')
    if Path(png).exists() and Path(png).stat().st_size >= MIN_SIZE:
      png_files.append(png)
    else:
      create_placeholder_png(png)
      png_files.append(png)

  return png_files


def create_placeholder_png(path: str, size: tuple = (1920, 1080)):
  """创建占位 PNG（纯黑 + 文字）"""
  try:
    cmd = [
      FFMPEG, "-y",
      "-f", "lavfi",
      "-i", f"color=c=black:s={size[0]}x{size[1]}:d=1",
      "-vf", "drawtext=text='Slide':fontsize=80:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2",
      "-frames:v", "1",
      path
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    print(f"  ✅ 占位图: {path}")
  except Exception as e:
    print(f"  ❌ 占位图失败: {e}")


def create_silent_clip(png: str, output: str, duration: int = 5):
  """生成静音视频片段（图片 + 静音）"""
  try:
    silence_aac = "/tmp/silence_temp.aac"
    subprocess.run([
      FFMPEG, "-y",
      "-f", "lavfi",
      "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-t", str(duration),
      "-c:a", "aac", "-b:a", "128k",
      silence_aac
    ], capture_output=True, check=True, timeout=30)

    cmd = [
      FFMPEG, "-y",
      "-loop", "1", "-i", png,
      "-i", silence_aac,
      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v", "libx264", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k",
      "-t", str(duration),
      output
    ]
    subprocess.run(cmd, capture_output=True, check=True, timeout=30)
    Path(silence_aac).unlink(missing_ok=True)
    print(f"  ✅ 静音片段: {output}")
    return True
  except Exception as e:
    print(f"  ❌ 静音片段失败: {e}")
    return False


def step6_video(html_files: List[str], audio_files: List[str], context: Dict[str, Any]) -> str:
  """Step 6: 合成视频"""
  print(f"\n🎬 Step 6: 视频合成（{len(html_files)} 页）...")

  png_files = ensure_screenshots(html_files)
  if len(png_files) < len(html_files):
    print("  ❌ 截图不足，无法合成")
    return None

  clips = []
  for i, (png, audio) in enumerate(zip(png_files, audio_files)):
    clip_path = OUTPUT_DIR / f"clip-{i+1:02d}.mp4"

    if audio and Path(audio).exists():
      cmd = [
        FFMPEG, "-y",
        "-loop", "1", "-i", png,
        "-i", audio,
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest",
        str(clip_path)
      ]
    else:
      cmd = [
        FFMPEG, "-y",
        "-loop", "1", "-i", png,
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-t", "5",
        "-c:a", "aac", "-b:a", "128k", "-shortest",
        str(clip_path)
      ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
      print(f"  ✅ 片段 {i+1}/{len(png_files)}: {clip_path.name}")
      clips.append(str(clip_path))
    else:
      print(f"  ❌ 片段 {i+1} 失败")
      print(f"  📋 命令: {' '.join(cmd)}")
      print(f"  📋 stderr: {result.stderr[:500]}")
      silent_clip = OUTPUT_DIR / f"clip-{i+1:02d}-silent.mp4"
      if create_silent_clip(png, str(silent_clip)):
        clips.append(str(silent_clip))
        print(f"  ⚠️  使用静音片段替代")
      else:
        print(f"  ❌ 静音片段也失败，跳过此页")
        return None

  final_output = OUTPUT_DIR / "presentation.mp4"
  list_file = OUTPUT_DIR / "clips.txt"
  with open(list_file, 'w') as f:
    for clip in clips:
      f.write(f"file '{clip}'\n")

  concat_cmd = [
    FFMPEG, "-y",
    "-f", "concat", "-safe", "0", "-i", str(list_file),
    "-c", "copy",
    str(final_output)
  ]

  result = subprocess.run(concat_cmd, capture_output=True, text=True)
  if result.returncode == 0:
    print(f"  ✅ 视频合成完成: {final_output}")
    context["video_path"] = str(final_output)
    context["total_duration"] = len(clips) * 5
    return str(final_output)
  else:
    print(f"  ❌ 拼接失败: {result.stderr[:200]}")
    return None


if __name__ == "__main__":
  (SLIDES_DIR / "slide-01.html").touch()
  (SLIDES_DIR / "slide-02.html").touch()
  (AUDIO_DIR / "audio-01.mp4").touch()
  (AUDIO_DIR / "audio-02.mp4").touch()

  result = step6_video(
    [str(SLIDES_DIR / "slide-01.html"), str(SLIDES_DIR / "slide-02.html")],
    [str(AUDIO_DIR / "audio-01.mp4"), str(AUDIO_DIR / "audio-02.mp4")],
    {}
  )
  print(f"\nStep 6 自测结果: {result}")
