# llm_router.py — simple model router

from typing import Optional
from llm import generate as qwen_generate 

def generate(prompt: str, model_key: Optional[str], max_new_tokens: int = 256) -> str:
    mk = (model_key or "qwen").lower()
    if mk == "qwen":
        return qwen_generate(prompt, max_new_tokens=max_new_tokens)
    elif mk == "gemini":
        # Placeholder until Sunera wires gemini
        # raise NotImplementedError("Gemini not integrated yet")
        return "Gemini integration pending on backend."  # temporary stub
    else:
        raise ValueError(f"Unknown model '{model_key}'. Use one of: qwen, gemini.")
