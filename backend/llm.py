# LLM.py 
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import re


# Model name
MODEL_NAME = "Qwen/Qwen3-0.6B"

#loading the model and tokenizer 
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype="auto",
    device_map="auto"
)

#This function prepares the prompt in a way that the model will understand
def _build_chat_text(prompt: str) -> str:
    messages = [{"role": "user", "content": prompt}]
    return tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=False   # <- turn off chain-of-thought output
    )

#Removes the thinking content from the final answer
def _strip_think(text: str) -> str:
    # Remove complete blocks
    text = re.sub(r"<think>.*?</think>\s*", "", text, flags=re.DOTALL)
    # If an opening tag remains without a closing tag, drop everything after it
    text = re.sub(r"<think>.*\Z", "", text, flags=re.DOTALL)
    # Clean any stray closing tags (just in case)
    text = text.replace("</think>", "")
    return text.strip()

#This function runs the prompt and gives the final answer
def generate(prompt: str, max_new_tokens: int = 256) -> str:
    chat_text = _build_chat_text(prompt)
    model_inputs = tokenizer([chat_text], return_tensors="pt").to(model.device)

    generated_ids = model.generate(
        **model_inputs,
        max_new_tokens=max_new_tokens
    )

    # Keep only newly generated tokens
    output_ids = generated_ids[0][len(model_inputs.input_ids[0]):]

    content = tokenizer.decode(output_ids, skip_special_tokens=True).strip()
    content = _strip_think(content)
    return content
