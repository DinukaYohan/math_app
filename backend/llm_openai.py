# llm_openai.py
import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).with_name(".env"))
key = os.getenv("OPENAI_API_KEY")
if not key:
    return_msg = "Missing OPENAI_API_KEY in backend/.env"
    raise RuntimeError(return_msg)
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
client = OpenAI()  # SDK reads OPENAI_API_KEY from env

def generate(prompt, max_new_tokens=256):
    if not prompt or not str(prompt).strip():
        return "Empty prompt."
    r = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role":"user","content": str(prompt)}],
        max_tokens=max_new_tokens,
        temperature=0.2,
    )
    return r.choices[0].message.content.strip()
