"""Local-first account/session helpers for the SMRITI pilot build."""
from __future__ import annotations
import hashlib, hmac, secrets
from datetime import datetime, timedelta, timezone
from fastapi import Cookie, HTTPException, status
from backend.database import get_db

SESSION_DAYS = 7
PBKDF2_ITERATIONS = 310_000


def _password_hash(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def _verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, iterations, salt_hex, digest_hex = encoded.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)).hex()
        return hmac.compare_digest(candidate, digest_hex)
    except (ValueError, TypeError):
        return False


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_account(email: str, password: str, display_name: str):
    conn = get_db()
    try:
        conn.execute("BEGIN IMMEDIATE")
        exists = conn.execute("SELECT id FROM users WHERE lower(email)=lower(?)", (email,)).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        user_id = secrets.token_hex(16)
        conn.execute("INSERT INTO users(id,email,display_name,password_hash,created_at) VALUES(?,?,?,?,?)",
                     (user_id, email.lower().strip(), display_name.strip(), _password_hash(password), datetime.now(timezone.utc).isoformat()))
        # Each account receives its own private profile. Legacy demo data is copied, never shared.
        profile_id = "profile_" + secrets.token_hex(12)
        conn.execute("INSERT INTO patient_profiles(id,user_id,display_name,relationship,created_at) VALUES(?,?,?,?,?)",
                     (profile_id, user_id, "My Memory Profile", "Self / family member", datetime.now(timezone.utc).isoformat()))
        legacy = "demo-patient-001"
        for table, cols in [
            ("memories", "title,category,person_name,relationship,place,event_name,memory_year,story,cue,importance,created_at,updated_at,photo_path,audio_path,tags,related_people"),
            ("game_results", "game_type,difficulty,score,accuracy,response_time,moves,hints,created_at"),
            ("mood_entries", "mood,created_at"),
        ]:
            rows = conn.execute(f"SELECT {cols} FROM {table} WHERE patient_id=?", (legacy,)).fetchall()
            names = cols.split(",")
            for row in rows:
                values = [row[name] for name in names]
                if table == "memories":
                    for media_field in ("photo_path", "audio_path"):
                        if media_field in names and values[names.index(media_field)] and values[names.index(media_field)].startswith("/uploads/"):
                            values[names.index(media_field)] = "/api/media/" + values[names.index(media_field)].rsplit("/", 1)[-1]
                conn.execute(f"INSERT INTO {table}(patient_id,{cols}) VALUES({','.join(['?']*(len(names)+1))})", [profile_id, *values])
        conn.commit()
        return {"id": user_id, "email": email.lower().strip(), "display_name": display_name.strip(), "default_profile_id": profile_id}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def authenticate(email: str, password: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE lower(email)=lower(?)", (email.strip(),)).fetchone()
    conn.close()
    if not row or not _verify_password(password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return {"id": row["id"], "email": row["email"], "display_name": row["display_name"]}


def create_session(user_id: str):
    token = secrets.token_urlsafe(36)
    expires = (datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).isoformat()
    conn = get_db()
    conn.execute("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)",
                 (_token_hash(token), user_id, expires, datetime.now(timezone.utc).isoformat()))
    conn.commit(); conn.close()
    return token, expires


def revoke_session(token: str | None):
    if not token: return
    conn = get_db(); conn.execute("DELETE FROM sessions WHERE token_hash=?", (_token_hash(token),)); conn.commit(); conn.close()


def current_user(smriti_session: str | None = Cookie(default=None)):
    if not smriti_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please sign in to continue.")
    conn = get_db()
    row = conn.execute("""SELECT u.id,u.email,u.display_name,s.expires_at FROM sessions s
        JOIN users u ON u.id=s.user_id WHERE s.token_hash=?""", (_token_hash(smriti_session),)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    try:
        if datetime.fromisoformat(row["expires_at"]) <= datetime.now(timezone.utc):
            revoke_session(smriti_session)
            raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid session. Please sign in again.")
    return {"id": row["id"], "email": row["email"], "display_name": row["display_name"]}


def user_owns_profile(user_id: str, profile_id: str) -> bool:
    conn = get_db(); row = conn.execute("SELECT 1 FROM patient_profiles WHERE id=? AND user_id=?", (profile_id, user_id)).fetchone(); conn.close()
    return bool(row)


def list_profiles(user_id: str):
    conn = get_db(); rows = conn.execute("SELECT id,display_name,relationship,created_at FROM patient_profiles WHERE user_id=? ORDER BY created_at", (user_id,)).fetchall(); conn.close()
    return [dict(r) for r in rows]


def create_profile(user_id: str, display_name: str, relationship: str):
    profile_id = "profile_" + secrets.token_hex(12)
    conn = get_db(); conn.execute("INSERT INTO patient_profiles(id,user_id,display_name,relationship,created_at) VALUES(?,?,?,?,?)",
        (profile_id,user_id,display_name.strip(),relationship.strip(),datetime.now(timezone.utc).isoformat())); conn.commit(); conn.close()
    return {"id":profile_id,"display_name":display_name.strip(),"relationship":relationship.strip()}
