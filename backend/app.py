# app.py — Flask API server

from flask import Flask, request, jsonify
from llm import generate  

app = Flask(__name__)

@app.route("/")
def home():
    return "<h1> FLASK REST API </h1>"

# POST /generate — bridges the HTTP request to Qwen3 via llm.generate()
@app.route("/generate", methods=["POST"])
def generate_endpoint():
    """
    Request JSON:
      - Either { "prompt": "..." }
      - Or { "grade": "4", "topic": "fractions" } and we'll build a simple prompt.

    Response JSON:
      { "prompt": "...", "content": "..." }
      (No thinking content is returned.)
    """
    data = request.get_json(silent=True) or {}

    # Use provided prompt, or build a simple one from grade/topic
    if data.get("prompt"):
        prompt = str(data["prompt"])
    else:
        grade = str(data.get("grade", "4"))
        topic = str(data.get("topic", "arithmetic"))
        prompt = (
            f"Create ONE short, correct, elementary-level math word problem "
            f"for grade {grade} on {topic}. Keep it clear and age-appropriate."
        )

    try:
        # llm.generate() should already strip any <think> content and return only the visible answer.
        content = generate(prompt, max_new_tokens=256)

        return jsonify({
            "prompt": prompt,
            "content": content  
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
