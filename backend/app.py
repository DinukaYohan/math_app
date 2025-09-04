# app.py — Flask API server


from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from llm import generate, MODEL_NAME
from auth import auth_bp
import sqlite3, os, uuid
from db import init_db, close_db
from db import save_qa
from db import list_qa_for_user


app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = "dev-secret-change-me"
jwt = JWTManager(app)


app.register_blueprint(auth_bp)


app.teardown_appcontext(close_db)
init_db()


@app.route("/")
def home():
    return "<h1> FLASK REST API </h1>"

# POST /generate — bridges the HTTP request to Qwen3 via llm.generate()

@app.route("/generate", methods=["POST"])
@jwt_required()
def generate_endpoint():
    data = request.get_json(silent=True) or {}# accept mine when in conflict 
    if data.get("prompt"):
        prompt = str(data["prompt"])
    else:
        grade = str(data.get("grade", "4"))
        topic = str(data.get("topic", "arithmetic"))
        prompt = (f"Create ONE short, correct, elementary-level math word problem "
                  f"for grade {grade} on {topic}. Keep it clear and age-appropriate.")
    try:
        uid = int(get_jwt_identity())             
        content = generate(prompt, max_new_tokens=256)
        qaid = save_qa(uid, prompt, content, MODEL_NAME) 
        return jsonify({"qaid": qaid, "prompt": prompt, "content": content, "model": MODEL_NAME}), 200
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
    return jsonify([dict(r) for r in rows]), 200


if __name__ == "__main__":
   app.run(host="127.0.0.1", port=8080, debug=True)
   
