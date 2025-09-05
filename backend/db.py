# db.py — SQLite helpers + schema used by auth.py and app.py
import json
import os, sqlite3
from typing import Iterable, Optional
from flask import g
import uuid

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
      meta_json TEXT,
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

#Helper functions used by /generate

def save_qa(user_id: int, question: str, answer: str, model: str, meta: dict | None = None) -> str:
    qaid = str(uuid.uuid4())
    db = get_db()
    db.execute(
        "INSERT INTO qa_pairs (qaid, user_id, question, answer, model, meta_json) VALUES (?,?,?,?,?,?)",
        (qaid, user_id, question, answer, model, json.dumps(meta or {})),
    )
    db.commit()
    return qaid



def list_qa_for_user(user_id: int, limit: int = 20, offset: int = 0):
    return get_db().execute(
        """
        SELECT qaid, question, answer, model, meta_json, created_at
        FROM qa_pairs
        WHERE user_id=?
        ORDER BY datetime(created_at) DESC
        LIMIT ? OFFSET ?
        """,
        (user_id, limit, offset),
    ).fetchall()


def get_qa(qaid: str, user_id: int) -> Optional[sqlite3.Row]:
    #Fetch a single questions and answers item by its id, scoped to the owner.
    return (
        get_db()
        .execute(
            """
            SELECT qaid, user_id, question, answer, model, created_at
            FROM qa_pairs
            WHERE qaid=? AND user_id=?
            """,
            (qaid, user_id),
        )
        .fetchone()
    )

def delete_qa(qaid: str, user_id: int) -> int:
    #Delete a questions and answers item by id, scoped to the owner. Returns number of rows deleted (0 or 1).
    db = get_db()
    cur = db.execute(
        "DELETE FROM qa_pairs WHERE qaid=? AND user_id=?",
        (qaid, user_id),
    )
    db.commit()
    return cur.rowcount
