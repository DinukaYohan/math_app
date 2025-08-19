# db.py — SQLite helpers + schema used by auth.py and app.py
import os, sqlite3
from flask import g

# DB file lives next to this module
DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")

def _connect():
     # open SQLite with a small lock timeout + allow threaded use (Flask)
    con = sqlite3.connect(DB_PATH, timeout=5.0, check_same_thread=False)
    con.row_factory = sqlite3.Row
     # WAL = better concurrency; keep durability reasonable
    con.execute("PRAGMA journal_mode=WAL;")
    con.execute("PRAGMA synchronous=NORMAL;")
    # enforce foreign keys at the DB level
    con.execute("PRAGMA foreign_keys=ON;")
    return con

def get_db():
     # one connection per request, cached on Flask 'g'
    if "db" not in g:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True) # ensure folder
        g.db = _connect()
    return g.db

def close_db(_exc=None):
       # close at request teardown
    db = g.pop("db", None)
    if db: db.close()

def init_db():
     # create tables/indexes if missing
    db = _connect()
    db.executescript("""
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS qa_pairs(
      qaid TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer   TEXT NOT NULL,
      model    TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_qa_user_created
      ON qa_pairs(user_id, created_at DESC);
    """)
    db.commit()
    db.close()

# --- functions expected by auth.py ---
def create_user(email, username, password_hash):
    # insert user; returns new integer id
    db = get_db()
    cur = db.execute(
        "INSERT INTO users(email, username, password_hash) VALUES(?,?,?)",
        (email, username, password_hash)
    )
    db.commit()
    return cur.lastrowid

def get_user_by_email(email):
        # fetch single user by email
    return get_db().execute(
        "SELECT id, email, username, password_hash, created_at FROM users WHERE email=?",
        (email,)
    ).fetchone()

def get_user_by_username(username):
    # fetch single user by username
    return get_db().execute(
        "SELECT id, email, username, password_hash, created_at FROM users WHERE username=?",
        (username,)
    ).fetchone()

def get_user_by_id(uid):
        # fetch single user by id
    return get_db().execute(
        "SELECT id, email, username, password_hash, created_at FROM users WHERE id=?",
        (uid,)
    ).fetchone()
