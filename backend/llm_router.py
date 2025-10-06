# llm_router.py — simple model router

from typing import Optional
from llm import generate as qwen_generate 

def generate(prompt: str, model_key: Optional[str], max_new_tokens: int = 256) -> str:
    mk = (model_key or "qwen").lower()
    if mk == "qwen":
        return qwen_generate(prompt, max_new_tokens=max_new_tokens)
    elif mk == "gemini":
        # Lazy import so google-generativeai is required only when used.
        from gemini import generate as gemini_generate  # type: ignore
        return gemini_generate(prompt, max_new_tokens=max_new_tokens)
    else:
        raise ValueError(f"Unknown model '{model_key}'. Use one of: qwen, gemini.")
