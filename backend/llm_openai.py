from openai import OpenAI
client = OpenAI(api_key="")  # DEV ONLY # ADD API KEY

def generate(prompt, max_new_tokens=256):
    r = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role":"user","content": prompt}],
        max_tokens=max_new_tokens, temperature=0.2
    )
    return r.choices[0].message.content.strip()
