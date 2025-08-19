# app.py — Flask API server


from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from llm import generate, MODEL_NAME
from auth import auth_bp
import sqlite3, os, uuid
from db import get_db



app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = "dev-secret-change-me"
jwt = JWTManager(app)


app.register_blueprint(auth_bp)


from db import get_db, init_db, close_db
app.teardown_appcontext(close_db)
init_db()



# --- SQLite setup ---
DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
con = sqlite3.connect(DB_PATH, check_same_thread=False)
con.row_factory = sqlite3.Row
con.executescript("""
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(
  uid TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  first_name TEXT, last_name TEXT,
  password_hash TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS qa_pairs(
  qaid TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer   TEXT NOT NULL,
  model TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_qapairs_userid_created
  ON qa_pairs(user_id, created_at DESC);
""")

def save_qa(uid, q, a, model):
    db = get_db()
    db.execute(
        "INSERT INTO qa_pairs(qaid,user_id,question,answer,model) VALUES(?,?,?,?,?)",
        (str(uuid.uuid4()), uid, q, a, model)
    )
    db.commit()


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
        uid = int(get_jwt_identity())             # <-- use JWT user id
        content = generate(prompt, max_new_tokens=256)
        save_qa(uid, prompt, content, MODEL_NAME) # <-- pass INT uid
        return jsonify({"prompt": prompt, "content": content}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    

    # ADDED: GET /history — list recent Q&A for the current user
@app.get("/history")
@jwt_required()
def history():
    uid = int(get_jwt_identity())  # TODO: read from session/JWT--Accepts benuls 
    limit  = int(request.args.get("limit", 20))
    offset = int(request.args.get("offset", 0))
    rows = con.execute("""
        SELECT qaid, question, answer, model, created_at
        FROM qa_pairs
        WHERE user_id=?
        ORDER BY datetime(created_at) DESC
        LIMIT ? OFFSET ?""", (uid, limit, offset)).fetchall()
    return jsonify([dict(r) for r in rows])


if __name__ == "__main__":
   app.run(host="127.0.0.1", port=8080, debug=True)
   
