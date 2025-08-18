# auth.py
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from db import create_user, get_user_by_email, get_user_by_username, get_user_by_id

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


#This is the /register route handler in the authentication system.This is used to let a new user sign up with email, username and password
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not email or not username or not password:
        return jsonify({"error": "email, username, and password required"}), 400

    if get_user_by_email(email):
        return jsonify({"error": "email already registered"}), 409
    if get_user_by_username(username):
        return jsonify({"error": "username already taken"}), 409

    pwd_hash = generate_password_hash(password)
    uid = create_user(email, username, pwd_hash)

    return jsonify({"id": uid, "email": email, "username": username}), 201

#This is the /login route which handles all the login activities
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    row = get_user_by_email(email)
    if not row:
        return jsonify({"error": "invalid credentials"}), 401

    uid, email, username, pwd_hash, _ = row
    if not check_password_hash(pwd_hash, password):
        return jsonify({"error": "invalid credentials"}), 401

    token = create_access_token(identity=uid)
    return jsonify({"access_token": token, "username": username})

#The /me route lets the logged in user to fetch their own profile using the token they got at login.
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    uid = get_jwt_identity()
    row = get_user_by_id(int(uid))
    if not row:
        return jsonify({"error": "user not found"}), 404
    uid, email, username, _, created_at = row
    return jsonify({
        "id": uid,
        "email": email,
        "username": username,
        "created_at": created_at
    })
