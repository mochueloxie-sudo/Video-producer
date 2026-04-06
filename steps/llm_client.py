"""
LLM 客户端（统一接口）

支持：
1. minimax（推荐，性价比高）
2. stepfun（StepFun GLM-4）
3. openai（GPT-4）
4. mock（测试用，返回模板）

用法：
  from llm_client import LLMClient
  client = LLMClient(provider="minimax")
  result = client.generate(prompt, system="...")
"""

import os
import json
import subprocess
from typing import Dict, Any, Optional
from pathlib import Path


class LLMClient:
  def __init__(self, provider: str = "minimax", api_key: Optional[str] = None, model: Optional[str] = None):
    self.provider = provider
    self.api_key = api_key or self._detect_api_key(provider)
    self.model = model or self._default_model(provider)

    if not self.api_key and provider not in ["mock", "none"]:
      raise ValueError(f"未找到 {provider} 的 API key，请设置环境变量或传入 api_key")

  def _detect_api_key(self, provider: str) -> Optional[str]:
    """自动检测 API key（从环境变量或 config.json）"""
    # 1. 先试环境变量
    env_vars = {
      "minimax": ["MINIMAX_API_KEY", "MINIMAX_GROUP_ID"],
      "stepfun": ["STEPFUN_API_KEY", "GLM_API_KEY", "STEP_API_KEY"],
      "openai": ["OPENAI_API_KEY"],
    }
    keys = env_vars.get(provider, [])
    for key in keys:
      val = os.environ.get(key)
      if val:
        return val

    # 2. 尝试 config.json（工作目录或技能目录）
    config_paths = [
      Path("/Users/teeclaw/.openclaw/workspace/video-producer/config.json"),
      Path("./config.json"),
      Path(__file__).resolve().parent.parent / "config.json"
    ]
    for cp in config_paths:
      if cp.exists():
        try:
          with open(cp) as f:
            cfg = json.load(f)
          if provider == "stepfun":
            key = cfg.get("stepfun", {}).get("api_key")
            if key:
              return key
          elif provider == "minimax":
            key = cfg.get("minimax", {}).get("api_key")
            if key:
              return key
          elif provider == "openai":
            key = cfg.get("openai", {}).get("api_key")
            if key:
              return key
        except Exception:
          pass
    return None

  def _default_model(self, provider: str) -> str:
    """默认模型"""
    defaults = {
      "minimax": "MiniMax-M2.7",
      "stepfun": "step-1-8k",
      "openai": "gpt-4o",
      "mock": "mock"
    }
    return defaults.get(provider, "default")

  def generate(self, prompt: str, system: str = "", max_tokens: int = 500, temperature: float = 0.7) -> str:
    """生成文本"""
    if self.provider == "minimax":
      return self._call_minimax(prompt, system, max_tokens, temperature)
    elif self.provider == "stepfun":
      return self._call_stepfun(prompt, system, max_tokens, temperature)
    elif self.provider == "openai":
      return self._call_openai(prompt, system, max_tokens, temperature)
    elif self.provider == "mock":
      return self._mock_generate(prompt, system)
    else:
      raise ValueError(f"不支持的 LLM 提供商: {self.provider}")

  def _call_minimax(self, prompt: str, system: str, max_tokens: int, temperature: float) -> str:
    """调用 Minimax API（通过 curl 或 requests）"""
    # Minimax 需要 Group ID 和 API Key
    group_id = os.environ.get("MINIMAX_GROUP_ID")
    if not group_id:
      raise ValueError("MINIMAX_GROUP_ID 未设置")

    # 用 curl 调用 Minimax Chat Completions API
    payload = {
      "model": self.model,
      "messages": [
        {"role": "system", "content": system} if system else None,
        {"role": "user", "content": prompt}
      ],
      "max_tokens": max_tokens,
      "temperature": temperature
    }
    # 过滤 None
    payload["messages"] = [m for m in payload["messages"] if m]

    cmd = [
      "curl", "-s", "-X", "POST",
      f"https://api.minimax.chat/v1/chat?GroupId={group_id}",
      "-H", f"Authorization: Bearer {self.api_key}",
      "-H", "Content-Type: application/json",
      "-d", json.dumps(payload)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
      raise RuntimeError(f"Minimax API 请求失败: {result.stderr}")

    data = json.loads(result.stdout)
    if data.get("base_resp", {}).get("status_code") != 0:
      raise RuntimeError(f"Minimax API 错误: {data}")

    choices = data.get("choices", [])
    if not choices:
      raise RuntimeError(f"Minimax 无返回: {data}")

    return choices[0]["message"]["content"].strip()

  def _call_stepfun(self, prompt: str, system: str, max_tokens: int, temperature: float) -> str:
    """调用 StepFun GLM-4 API"""
    url = "https://api.stepfun.com/v1/chat/completions"
    messages = []
    if system:
      messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
      "model": self.model,
      "messages": messages,
      "max_tokens": max_tokens,
      "temperature": temperature
    }

    cmd = [
      "curl", "-s", "-X", "POST", url,
      "-H", f"Authorization: Bearer {self.api_key}",
      "-H", "Content-Type: application/json",
      "-d", json.dumps(payload)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
      raise RuntimeError(f"StepFun API 请求失败: {result.stderr}")

    data = json.loads(result.stdout)
    if "error" in data:
      raise RuntimeError(f"StepFun API 错误: {data['error']}")

    choices = data.get("choices", [])
    if not choices:
      raise RuntimeError(f"StepFun 无返回: {data}")
    
    message = choices[0]["message"]
    # step-3.5-flash 等推理模型返回在 reasoning 字段
    content = message.get("content") or message.get("reasoning") or ""
    return content.strip()

  def _call_openai(self, prompt: str, system: str, max_tokens: int, temperature: float) -> str:
    """调用 OpenAI API"""
    # 类似 stepfun，端点不同
    url = "https://api.openai.com/v1/chat/completions"
    messages = []
    if system:
      messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
      "model": self.model,
      "messages": messages,
      "max_tokens": max_tokens,
      "temperature": temperature
    }

    cmd = [
      "curl", "-s", "-X", "POST", url,
      "-H", f"Authorization: Bearer {self.api_key}",
      "-H", "Content-Type: application/json",
      "-d", json.dumps(payload)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
      raise RuntimeError(f"OpenAI API 请求失败: {result.stderr}")

    data = json.loads(result.stdout)
    if "error" in data:
      raise RuntimeError(f"OpenAI API 错误: {data['error']}")

    return data["choices"][0]["message"]["content"].strip()

  def _mock_generate(self, prompt: str, system: str) -> str:
    """测试用：返回模板"""
    return f"[Mock] 基于提示生成的内容：{prompt[:50]}...（系统提示：{system[:30]}）"


def get_llm_client(provider: str = None) -> LLMClient:
  """获取 LLM 客户端（从环境变量或默认）"""
  provider = provider or os.environ.get("LLM_PROVIDER", "minimax")
  return LLMClient(provider=provider)


if __name__ == "__main__":
  # 测试
  try:
    client = LLMClient(provider="mock")
    result = client.generate("你好", system="你是一个助手")
    print("Mock 测试:", result)
  except Exception as e:
    print("❌", e)
