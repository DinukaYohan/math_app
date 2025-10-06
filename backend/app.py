 # app.py — Flask API server


import json
import os


from llm_router import generate as route_generate
from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_cors import CORS
from auth import auth_bp
from db import (
    init_db, close_db,
    save_qa, list_qa_for_user,
    import_learning_objectives_xlsx,
    list_distinct_countries, list_distinct_languages, list_distinct_grades,
    list_topics, list_objectives, combo_is_valid,
    set_review, 
)


app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = "dev-secret-change-me"
jwt = JWTManager(app)

app.register_blueprint(auth_bp)

app.teardown_appcontext(close_db)
init_db()

CORS(app, resources={r"/*": {"origins": "*"}})

@app.route("/")
def home():
    return "<h1> FLASK REST API </h1>"

#Explicit list of supported model keys as I removed the config.py
MODELS = ["qwen", "gemini", "openai" ]

#For the frontend to call the dropdowns
@app.get("/options/bootstrap")
def bootstrap_options():
    """
    Initial payload for populating base dropdowns (countries/grades/languages/models).
    All values come from the learning_objectives table (except models).
    """
    return jsonify({
        "countries": list_distinct_countries(),
        "grades":    list_distinct_grades(),
        "languages": list_distinct_languages(),
        "models":    MODELS,
    }), 200

#For the list of topics for the selected country, grade and language
@app.get("/options/topics")
def options_topics():
    """
    Return the list of topics for the selected (country, grade, language).
    """
    country  = (request.args.get("country")  or "").strip()
    grade    = (request.args.get("grade")    or "").strip()
    language = (request.args.get("language") or "").strip()
    if not (country and grade and language):
        return jsonify({"error": "country, grade, language required"}), 400
    return jsonify({"topics": list_topics(country, grade, language)}), 200

#For the list of learning objectives that matches the selected country, grade, language and topic
@app.get("/options/objectives")
def options_objectives():
    """
    Return learning objectives for the selected (country, grade, language, topic).
    """
    country  = (request.args.get("country")  or "").strip()
    grade    = (request.args.get("grade")    or "").strip()
    language = (request.args.get("language") or "").strip()
    topic    = (request.args.get("topic")    or "").strip()
    if not (country and grade and language and topic):
        return jsonify({"error": "country, grade, language, topic required"}), 400
    return jsonify({"objectives": list_objectives(country, grade, language, topic)}), 200

#For the list of available languages filtered by country
@app.get("/options/languages")
def options_languages():
    """
    Return available languages filtered by country (and optional grade).
    """
    country = (request.args.get("country") or "").strip()
    if not country:
        return jsonify({"error": "country required"}), 400
    langs = list_distinct_languages(country=country or None)
    return jsonify({"languages": langs}), 200


# POST /generate — bridges the HTTP request to Qwen3 via llm.generate()
@app.post("/generate")
@jwt_required()
def generate_endpoint():
    """
    POST /generate
    Accepts either:
      - Raw: { prompt, model? }
      - Structured (recommended): {
            country, grade, language, topic, learning_objective?, model
        }
    Validates structured selections against DB-driven learning objectives.
    """
    uid = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    # Raw prompt still supported
    prompt = (data.get("prompt") or "").strip()

    # Model validation (small static list)
    model = (data.get("model") or "qwen").strip().lower()
    if model not in MODELS:
        return jsonify({"error": f"invalid model: {model}"}), 400

    if not prompt:
        # Structured path
        country  = (data.get("country")  or "").strip()
        language = (data.get("language") or "").strip()
        grade    = (str(data.get("grade") or "")).strip()
        topic    = (data.get("topic")    or "").strip()
        lo       = (data.get("learning_objective") or "").strip()

        # Basic completeness
        if not (country and grade and language and topic):
            return jsonify({"error": "country, grade, language, topic required"}), 400

        # Validate combo against DB; if LO given, validate the full quartet+LO
        if not combo_is_valid(country, grade, language, topic, lo if lo else None):
            return jsonify({"error": "No matching entries for the given selection"}), 400

        # Build prompt using the selected LO when provided
        prompt = (
            f"Create ONE short, correct, elementary-level math word problem for grade {grade} "
            f"about {topic}. "
            + (f"Align the question with this learning objective: '{lo}'. " if lo else "")
            + f"Use culturally appropriate examples for {country}. "
            f"Language: {language}. Keep it clear and age-appropriate."
        )
    else:
        # Raw path: keep behavior; no LO validation
        country = language = grade = topic = lo = ""

    try:
        content = route_generate(prompt, model_key=model, max_new_tokens=256)

        # Persist to history with meta so the UI can show the selections
        meta = {
            "country": country,
            "grade": grade,
            "language": language,
            "topic": topic,
            "learning_objective": lo,
        }
        qaid = save_qa(uid, prompt, content, model, meta=meta)

        return jsonify({
            "qaid": qaid,
            "prompt": prompt,
            "content": content,
            "model_used": model,
            "meta": meta,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500



    
 # ADDED: GET /history — list recent Q&A for the current user
@app.get("/history")
@jwt_required()
def history():
    """
    GET /history
    Returns recent Q&A for the current user with parsed meta (if present).
    """
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
            del item["meta_json"]
        out.append(item)

    return jsonify(out), 200

#Auto import Excel sheet on startup
try:
    DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "maths LOs.xlsx")
    if os.path.exists(DATA_PATH):
        with app.app_context():
            import_learning_objectives_xlsx(DATA_PATH)
            print("Learning objectives imported from:", DATA_PATH)
    else:
        print("WARNING: LO spreadsheet not found at", DATA_PATH)
except Exception as e:
    print("ERROR importing LOs on startup:", e)

@app.post("/api/chat")
def api_chat():
    data = request.get_json(force=True, silent=True) or {}
    try:
        reply = route_generate(data.get("message",""), data.get("model","openai"))
        return jsonify({"reply": reply}), 200
    except Exception as e:
        print("LLM error:", e)
        return jsonify({"error": str(e)}), 500
    
@app.post("/qa/<qaid>/review")
@jwt_required()
def review_endpoint(qaid):
    uid = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    score_raw = (data.get("score") or "").strip().lower()  # "up" | "down" | "" (clear)
    text = (data.get("text") or "").strip()

    if score_raw not in ("", "up", "down"):
        return jsonify({"error": "score must be 'up', 'down', or empty to clear"}), 400

    score = 1 if score_raw == "up" else (-1 if score_raw == "down" else None)

    try:
        set_review(uid, qaid, score, text if (text or score is not None) else None)
    except PermissionError:
        return jsonify({"error": "not found"}), 404

    return jsonify({"qaid": qaid, "review": {"score": score, "text": text}}), 200



if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=False)
