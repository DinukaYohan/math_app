# app.py — Flask API server


import json
from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from auth import auth_bp
from config import CONFIG
from db import init_db, close_db
from db import save_qa
from db import list_qa_for_user
from llm_router import generate as routed_generate


app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = "dev-secret-change-me"
jwt = JWTManager(app)


app.register_blueprint(auth_bp)


app.teardown_appcontext(close_db)
init_db()


@app.route("/")
def home():
    return "<h1> FLASK REST API </h1>"



#Returns the dropdown options (topics, countries, languages, grades, models)
@app.get("/config")
def get_config():
    
    fields = request.args.get("fields")
    if fields:
        wanted = {f.strip() for f in fields.split(",") if f.strip()}
        return jsonify({k: v for k, v in CONFIG.items() if k in wanted}), 200
    return jsonify(CONFIG), 200

def _in_config(value: str, key: str) -> bool:
    """Case-insensitive membership check for simple lists in CONFIG."""
    if value is None:
        return False
    return value.lower() in {v.lower() for v in CONFIG.get(key, [])}

# POST /generate — bridges the HTTP request to Qwen3 via llm.generate()
@app.post("/generate")
@jwt_required()
def generate_endpoint():
    uid = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    # If a raw prompt is provided, use it directly.
    prompt = (data.get("prompt") or "").strip()

    # Otherwise, build a prompt from dropdown selections.
    if not prompt:
        topic    = (data.get("topic") or "").strip().lower()
        country  = (data.get("country") or "").strip()
        language = (data.get("language") or "en").strip().lower()
        grade    = str(data.get("grade", "3")).strip()
        model    = (data.get("model") or "qwen").strip().lower()

        # Validate inputs against CONFIG (lightweight, clear errors)
        if topic and not _in_config(topic, "topics"):
            return jsonify({"error": f"invalid topic: {topic}"}), 400
        if country and country not in CONFIG["countries"]:
            return jsonify({"error": f"invalid country: {country}"}), 400
        if language and language not in CONFIG["languages"]:
            return jsonify({"error": f"invalid language: {language}"}), 400
        if grade and grade not in CONFIG["grades"]:
            return jsonify({"error": f"invalid grade: {grade}"}), 400
        if model and model not in CONFIG["models"]:
            return jsonify({"error": f"invalid model: {model}"}), 400
    else:
        # Raw prompt path; defaults to Qwen unless an explicit model is passed.
        topic = ""
        country = ""
        language = "en"
        grade = ""
        model = (data.get("model") or "qwen").strip().lower()
        if model not in CONFIG["models"]:
            return jsonify({"error": f"invalid model: {model}"}), 400

    # Build the prompt if not supplied
    if not prompt:
        prompt = (
            f"Create ONE short, correct, elementary-level math word problem "
            f"for grade {grade or '3'} about {topic or 'arithmetic'}. "
            f"Use culturally appropriate examples for {country or 'the selected country'}. "
            f"Language: {language or 'en'}. Keep it clear and age-appropriate."
        )

    try:
        # Route to chosen model (Qwen now; Gemini can be plugged in later)
        content = routed_generate(prompt, model_key=model, max_new_tokens=256)

        # Persist to history
        save_qa(uid, prompt, content, model)

        return jsonify({
            "prompt": prompt,
            "content": content,
            "model_used": model
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    
 # ADDED: GET /history — list recent Q&A for the current user
@app.get("/history")
@jwt_required()
def history():
    uid = int(get_jwt_identity())
    limit  = int(request.args.get("limit", 20))
    offset = int(request.args.get("offset", 0))

    rows = list_qa_for_user(uid, limit=limit, offset=offset)

    out = []
    for r in rows:
        item = dict(r)  # convert sqlite3.Row to dict
        if "meta_json" in item and item["meta_json"]:
            try:
                item["meta"] = json.loads(item["meta_json"])
            except json.JSONDecodeError:
                item["meta"] = {}
            del item["meta_json"]  # remove the raw JSON string
        out.append(item)

    return jsonify(out), 200


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=True)
   
