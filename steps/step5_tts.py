"""
Step 5: TTS 语音生成（三级降级：Minimax → Tencent → say）

配置来源：优先读取 config.json，其次环境变量
"""

import subprocess
import json
import os
import time
import binascii
from pathlib import Path
from typing import List, Dict, Any

AUDIO_DIR = Path("/tmp/video-producer-audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# 加载配置
def load_config() -> Dict[str, Any]:
  config_path = Path(__file__).resolve().parent.parent / "config.json"
  if config_path.exists():
    with open(config_path) as f:
      cfg = json.load(f)
      if "paths" in cfg:
        cfg.update(cfg["paths"])
      return cfg
  alt_path = Path("/Users/teeclaw/.openclaw/workspace/video-producer/config.json")
  if alt_path.exists():
    with open(alt_path) as f:
      cfg = json.load(f)
      if "paths" in cfg:
        cfg.update(cfg["paths"])
      return cfg
  return {}

CONFIG = load_config()

# 路径配置
FFMPEG = CONFIG.get("ffmpeg", "/Users/teeclaw/bin/ffmpeg")


# ============ TTS 引擎基类 ============

class TTSEngine:
  name = "base"
  def synthesize(self, text: str, output_path: str) -> bool:
    raise NotImplementedError


# ============ 1. Minimax TTS ============

class MinimaxTTS(TTSEngine):
  """Minimax T2A V2（speech-2.8-hd）"""
  name = "minimax"

  def __init__(self):
    cfg = CONFIG.get("minimax", {})
    self.api_key = cfg.get("api_key") or os.environ.get("MINIMAX_API_KEY") or os.environ.get("STEP_API_KEY")
    self.voice_id = cfg.get("voice_id", "female-tianmei")
    self.model = cfg.get("model", "speech-2.8-hd")

    if not self.api_key:
      raise ValueError("Minimax TTS 未配置 API key（config.json 或 MINIMAX_API_KEY）")

  def synthesize(self, text: str, output_path: str) -> bool:
    try:
      url = "https://api-bj.minimaxi.com/v1/t2a_v2"
      payload = {
        "model": self.model,
        "text": text,
        "voice_setting": {
          "voice_id": self.voice_id,
          "speed": 1.0,
          "vol": 1.0,
          "pitch": 0
        },
        "audio_setting": {
          "sample_rate": 32000,
          "bitrate": 128000,
          "format": "mp3",
          "channel": 1
        },
        "stream": False
      }

      cmd = [
        "curl", "-s", "-X", "POST", url,
        "-H", f"Authorization: Bearer {self.api_key}",
        "-H", "Content-Type: application/json",
        "-d", json.dumps(payload, ensure_ascii=False)
      ]

      result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
      if result.returncode != 0:
        print(f"  ❌ HTTP 错误: {result.stderr[:200]}")
        return False

      data = json.loads(result.stdout)
      base_resp = data.get("base_resp", {})
      if base_resp.get("status_code") != 0:
        print(f"  ❌ API 错误: {base_resp.get('status_msg', '未知')}")
        print(f"  📋 完整响应: {json.dumps(data, ensure_ascii=False)[:300]}")
        return False

      hex_audio = data.get("data", {}).get("audio")
      if not hex_audio:
        print("  ❌ 响应中无音频数据")
        print(f"  📋 data 字段: {list(data.get('data', {}).keys())}")
        return False

      audio_bytes = binascii.unhexlify(hex_audio)
      tmp_mp3 = output_path.replace('.aac', '.mp3')
      with open(tmp_mp3, 'wb') as f:
        f.write(audio_bytes)

      subprocess.run([
        FFMPEG, "-y",
        "-i", tmp_mp3,
        "-c:a", "aac", "-b:a", "128k",
        output_path
      ], capture_output=True, check=True, timeout=30)

      Path(tmp_mp3).unlink(missing_ok=True)
      return True

    except Exception as e:
      print(f"  ❌ Minimax 异常: {e}")
      import traceback
      traceback.print_exc()
      return False


# ============ 2. 腾讯云 TTS ============

class TencentTTS(TTSEngine):
  """腾讯云 TTS（TC3 签名）"""
  name = "tencent"

  def __init__(self):
    cfg = CONFIG.get("tencent", {})
    self.secret_id = cfg.get("secret_id") or os.environ.get("TENCENT_SECRET_ID")
    self.secret_key = cfg.get("secret_key") or os.environ.get("TENCENT_SECRET_KEY")
    self.region = cfg.get("region", "ap-shanghai")

    if not self.secret_id or not self.secret_key:
      raise ValueError("腾讯云 TTS 未配置（config.json 或 TENCENT_SECRET_ID/SECRET_KEY）")

  def synthesize(self, text: str, output_path: str) -> bool:
    try:
      import hmac, hashlib

      host = "tts.tencentcloudapi.com"
      timestamp = int(time.time())
      date = time.strftime("%Y-%m-%d", time.gmtime(timestamp))

      params = {
        "Text": text,
        "SessionId": f"session-{timestamp}",
        "Volume": 10,
        # "Speed": 100,  # 某些账号受限，注释掉用默认
        "VoiceType": 101001,
        "PrimaryLanguage": 1,
        "SampleRate": 16000
      }

      payload = json.dumps(params, ensure_ascii=False)

      def sign(key, msg):
        return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()

      secret_date = sign(("TC3" + self.secret_key).encode("utf-8"), date)
      secret_service = sign(secret_date, "tts")
      secret_signing = sign(secret_service, "tc3_request")

      canonical = f"POST\n/\n\ncontent-type:application/json\nhost:{host}\n\ncontent-type;host\n{hashlib.sha256(payload.encode()).hexdigest()}"
      credential = f"{date}/tts/tc3_request"
      string_to_sign = f"TC3-HMAC-SHA256\n{timestamp}\n{credential}\n{hashlib.sha256(canonical.encode()).hexdigest()}"
      signature = hmac.new(secret_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()

      auth = f"TC3-HMAC-SHA256 Credential={self.secret_id}/{credential}, SignedHeaders=content-type;host, Signature={signature}"

      cmd = [
        "curl", "-s", "-X", "POST", f"https://{host}",
        "-H", "Content-Type: application/json",
        "-H", f"Host: {host}",
        "-H", f"X-TC-Action: TextToVoice",
        "-H", f"X-TC-Version: 2019-08-23",
        "-H", f"X-TC-Region: {self.region}",
        "-H", f"X-TC-Timestamp: {timestamp}",
        "-H", f"Authorization: {auth}",
        "-d", payload
      ]

      result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
      data = json.loads(result.stdout)

      if "Response" in data and "Audio" in data["Response"]:
        import base64
        audio_bytes = base64.b64decode(data["Response"]["Audio"])
        with open(output_path, 'wb') as f:
          f.write(audio_bytes)
        return True
      else:
        err = data.get("Response", {}).get("Error", {})
        print(f"  ❌ 腾讯云错误: {err.get('Code')} - {err.get('Message')}")
        return False

    except Exception as e:
      print(f"  ❌ 腾讯云异常: {e}")
      return False


# ============ 3. macOS say ============

class SayEngine(TTSEngine):
  name = "say"

  def synthesize(self, text: str, output_path: str) -> bool:
    try:
      aiff = output_path.replace('.aac', '.aiff')
      subprocess.run(["say", "-v", "Tingting", "-o", aiff, text],
                     check=True, capture_output=True, timeout=30)
      subprocess.run([FFMPEG, "-y", "-i", aiff, "-c:a", "aac", "-b:a", "128k", output_path],
                     capture_output=True, check=True, timeout=30)
      Path(aiff).unlink(missing_ok=True)
      return True
    except Exception as e:
      print(f"  ❌ say 失败: {e}")
      return False


# ============ TTS 管理器 ============

class TTSManager:
  def __init__(self, preferred: str = "minimax"):
    self.engines = []
    self._init_engines(preferred)

  def _init_engines(self, preferred: str):
    priority = {
      "minimax": [MinimaxTTS, TencentTTS, SayEngine],
      "tencent": [TencentTTS, MinimaxTTS, SayEngine],
      "say": [SayEngine, MinimaxTTS, TencentTTS]
    }
    order = priority.get(preferred, priority["minimax"])
    for cls in order:
      try:
        self.engines.append(cls())
        print(f"  ✅ {cls.name} 引擎就绪")
      except Exception as e:
        print(f"  ⚠️  {cls.name} 初始化失败: {e}")
    if not self.engines:
      raise RuntimeError("无可用 TTS 引擎")

  def synthesize(self, text: str, output_path: str) -> bool:
    for engine in self.engines:
      print(f"  🔄 尝试 {engine.name}...")
      if engine.synthesize(text, output_path):
        print(f"  ✅ {engine.name} 成功")
        return True
      print(f"  ⚠️  {engine.name} 失败，下一个...")
    print(f"  ❌ 全部失败")
    return False


# ============ Step 5 主函数 ============

def step5_tts(scripts: List[str], context: Dict[str, Any]) -> List[str]:
  print(f"\n🎙️  Step 5: TTS 语音生成...")

  provider = context.get("tts_engine") or CONFIG.get("tts", {}).get("provider") or "minimax"
  print(f"  首选引擎: {provider}")

  try:
    tts = TTSManager(preferred=provider)
  except Exception as e:
    print(f"  ❌ 管理器失败: {e}")
    tts = TTSManager(preferred="say")

  audio_files = []
  for i, script in enumerate(scripts):
    # 清理 XML 标记（保留文本内容，移除 <num>/<code> 等标签）
    import re
    clean_script = re.sub(r'<[^>]*>', '', script)
    
    filename = AUDIO_DIR / f"audio-{i+1:02d}.aac"
    print(f"  第 {i+1}/{len(scripts)} 页: {script[:30]}...")
    if tts.synthesize(clean_script, str(filename)):
      audio_files.append(str(filename))
    else:
      print(f"  ⚠️  失败，用静音替代")
      silent = AUDIO_DIR / f"silence-{i+1:02d}.aac"
      create_silence_aac(5, str(silent))
      audio_files.append(str(silent))

  context["audio_files"] = audio_files
  context["tts_engine_used"] = tts.engines[0].name if tts.engines else "none"
  return audio_files


def create_silence_aac(duration: int, path: str) -> bool:
  try:
    subprocess.run([FFMPEG, "-y", "-f", "lavfi", "-i", f"anullsrc=channel_layout=stereo:sample_rate=44100",
                   "-t", str(duration), "-c:a", "aac", "-b:a", "128k", path],
                   capture_output=True, check=True, timeout=30)
    return True
  except Exception as e:
    print(f"  ❌ 静音失败: {e}")
    return False


if __name__ == "__main__":
  print("配置加载: ffmpeg =", FFMPEG)
  print("测试 Minimax TTS...")
  ctx = {}
  result = step5_tts(["测试第一页内容", "测试第二页内容"], ctx)
  print("结果:", result)
