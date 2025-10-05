# llm_router.py — simple model router

from typing import Optional
from llm import generate as qwen_generate 

try:
    from llm_openai import generate as openai_generate
except Exception:
    def openai_generate(prompt: str, max_new_tokens: int = 256) -> str:
        return "OpenAI backend not configured."

def generate(prompt: str, model_key: Optional[str], max_new_tokens: int = 256) -> str:
    mk = (model_key or "qwen").lower()
    if mk in ("openai", "gpt", "chatgpt"):
        return openai_generate(prompt, max_new_tokens=max_new_tokens)
    if mk == "qwen":
        return qwen_generate(prompt, max_new_tokens=max_new_tokens)
    elif mk == "gemini":
        # Placeholder until Sunera wires gemini
        # raise NotImplementedError("Gemini not integrated yet")
        return "Gemini integration pending on backend."  # temporary stub
    else:
        raise ValueError(f"Unknown model '{model_key}'. Use one of: qwen, gemini.")


