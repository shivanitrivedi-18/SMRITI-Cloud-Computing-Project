# =========================================================
# SMRITI BACKEND - FastAPI + SQLite + Personal Memory Layer
# Phase 2: account authentication and private family profiles
# =========================================================
from pathlib import Path
from uuid import uuid4
from mimetypes import guess_type
from fastapi import FastAPI, File, HTTPException, Query, UploadFile, Depends, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.ai_engine import get_adaptive_recommendation
from backend.insights import build_forecast, reminiscence_prompts, demo_sessions, weekly_summary, enrich_with_memory
from backend.database import (
    get_db, init_db, save_game_result, get_recent_results,
    get_memories, get_memory, create_memory, update_memory, update_memory_media, delete_memory,
    save_mood, get_latest_mood,
)
from backend.models import GameResult, MemoryCreate, MoodCreate, MemoryLinkCreate
from backend.auth import (create_account, authenticate, create_session, revoke_session,
                          current_user, user_owns_profile, list_profiles, create_profile)

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="SMRITI", description="Personalized memory-support platform with private family profiles and rule-based adaptive recommendations.", version="1.6.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
                   allow_credentials=True, allow_methods=["GET", "POST", "PUT", "DELETE"],
                   allow_headers=["Content-Type"])
init_db()


class RegisterInput(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=10, max_length=128)
    display_name: str = Field(min_length=2, max_length=80)

class LoginInput(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)

class ProfileInput(BaseModel):
    display_name: str = Field(min_length=2, max_length=80)
    relationship: str = Field(min_length=2, max_length=60)


def ensure_profile_access(user: dict, profile_id: str):
    if not user_owns_profile(user["id"], profile_id):
        raise HTTPException(status_code=404, detail="Profile not found in this family account.")


def _set_session_cookie(response: Response, token: str):
    response.set_cookie("smriti_session", token, httponly=True, secure=False,
                        samesite="lax", max_age=7 * 24 * 60 * 60, path="/")


@app.post("/api/auth/register")
def register(data: RegisterInput, response: Response):
    email = data.email.strip().lower()
    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    user = create_account(email, data.password, data.display_name)
    token, _ = create_session(user["id"])
    _set_session_cookie(response, token)
    return {"status": "success", "user": {k: user[k] for k in ("id", "email", "display_name")},
            "default_profile_id": user["default_profile_id"]}


@app.post("/api/auth/login")
def login(data: LoginInput, response: Response):
    user = authenticate(data.email, data.password)
    token, _ = create_session(user["id"])
    _set_session_cookie(response, token)
    profiles = list_profiles(user["id"])
    return {"status": "success", "user": user, "profiles": profiles,
            "default_profile_id": profiles[0]["id"] if profiles else None}


@app.post("/api/auth/logout")
def logout(response: Response, smriti_session: str | None = Cookie(default=None)):
    revoke_session(smriti_session)
    response.delete_cookie("smriti_session", path="/")
    return {"status": "success", "message": "Signed out."}


@app.get("/api/auth/me")
def auth_me(user: dict = Depends(current_user)):
    profiles = list_profiles(user["id"])
    return {"status": "success", "user": user, "profiles": profiles,
            "default_profile_id": profiles[0]["id"] if profiles else None}


@app.get("/api/profiles")
def profiles(user: dict = Depends(current_user)):
    return {"status": "success", "profiles": list_profiles(user["id"])}


@app.post("/api/profiles")
def add_profile(data: ProfileInput, user: dict = Depends(current_user)):
    if len(list_profiles(user["id"])) >= 25:
        raise HTTPException(status_code=400, detail="An account can have up to 25 profiles in this pilot.")
    profile = create_profile(user["id"], data.display_name, data.relationship)
    return {"status": "success", "profile": profile}


@app.get("/api/health")
def health():
    return {"status": "healthy", "app": "SMRITI", "version": app.version}


@app.get("/api/info")
def app_info(user: dict = Depends(current_user)):
    return {"name": "SMRITI", "version": app.version,
            "description": "Personalized memory-support platform with private family profiles and rule-based adaptive recommendations",
            "capabilities": ["adaptive cognitive activities", "performance history", "private family memory profiles", "mood check-ins", "caregiver insights"]}


@app.post("/api/game-results")
def submit_game_result(result: GameResult, user: dict = Depends(current_user)):
    ensure_profile_access(user, result.patient_id)
    result_id = save_game_result(result)
    recommendation = get_adaptive_recommendation(get_recent_results(result.patient_id, 5))
    conn = get_db()
    recommendation = enrich_with_memory(recommendation, conn, result.patient_id); conn.close()
    return {"status": "success", "result_id": result_id, "game_result": result.model_dump(), "recommendation": recommendation}


@app.get("/api/patient/{patient_id}/history")
def get_patient_history(patient_id: str, user: dict = Depends(current_user)):
    ensure_profile_access(user, patient_id)
    conn = get_db(); rows = conn.execute("SELECT * FROM game_results WHERE patient_id=? ORDER BY created_at DESC LIMIT 30", (patient_id,)).fetchall(); conn.close()
    return {"status": "success", "patient_id": patient_id, "history": [dict(row) for row in rows]}


@app.get("/api/patient/{patient_id}/summary")
def get_patient_summary(patient_id: str, user: dict = Depends(current_user)):
    ensure_profile_access(user, patient_id)
    conn = get_db()
    summary = conn.execute("SELECT COUNT(*) AS total_sessions, AVG(score) AS average_score, AVG(accuracy) AS average_accuracy, MAX(score) AS best_score FROM game_results WHERE patient_id=?", (patient_id,)).fetchone()
    conn.close(); latest_mood = get_latest_mood(patient_id)
    if summary["total_sessions"] == 0:
        return {"status":"success","total_sessions":0,"average_score":0,"average_accuracy":0,"best_score":0,"latest_mood":dict(latest_mood) if latest_mood else None}
    return {"status":"success","total_sessions":summary["total_sessions"],"average_score":round(summary["average_score"],1),"average_accuracy":round(summary["average_accuracy"],1),"best_score":round(summary["best_score"],1),"latest_mood":dict(latest_mood) if latest_mood else None}


@app.get("/api/patient/{patient_id}/trend")
def get_patient_trend(patient_id: str, user: dict = Depends(current_user)):
    ensure_profile_access(user, patient_id)
    conn=get_db(); rows=conn.execute("SELECT score,accuracy,game_type,created_at FROM game_results WHERE patient_id=? ORDER BY created_at ASC LIMIT 30",(patient_id,)).fetchall(); conn.close()
    return {"status":"success","patient_id":patient_id,"trend":[dict(row) for row in rows]}


@app.get("/api/patient/{patient_id}/adaptive")
def get_patient_adaptive_recommendation(patient_id: str, user: dict = Depends(current_user)):
    ensure_profile_access(user, patient_id)
    conn = get_db()
    rec = enrich_with_memory(get_adaptive_recommendation(get_recent_results(patient_id,5)), conn, patient_id); conn.close()
    return {"status":"success","patient_id":patient_id,"recommendation":rec}


@app.get("/api/patient/{patient_id}/memories")
def patient_memories(patient_id: str, search: str | None = Query(default=None,max_length=100), category: str | None = Query(default=None,max_length=40), user: dict = Depends(current_user)):
    ensure_profile_access(user, patient_id)
    return {"status":"success","patient_id":patient_id,"memories":[dict(row) for row in get_memories(patient_id,search=search,category=category)]}


@app.post("/api/memories")
def add_memory(memory: MemoryCreate, user: dict = Depends(current_user)):
    ensure_profile_access(user, memory.patient_id)
    memory_id=create_memory(memory)
    return {"status":"success","memory_id":memory_id,"message":"Memory saved successfully."}


@app.put("/api/patient/{patient_id}/memories/{memory_id}")
def edit_memory(patient_id: str,memory_id: int,memory: MemoryCreate,user: dict=Depends(current_user)):
    ensure_profile_access(user,patient_id)
    if memory.patient_id != patient_id: raise HTTPException(status_code=400,detail="Profile does not match this memory.")
    if not update_memory(patient_id,memory_id,memory): raise HTTPException(status_code=404,detail="Memory not found.")
    return {"status":"success","message":"Memory updated successfully."}


@app.post("/api/patient/{patient_id}/memories/{memory_id}/media")
async def upload_memory_media(patient_id: str,memory_id: int,kind: str=Query(...,pattern="^(photo|audio)$"),file: UploadFile=File(...),user: dict=Depends(current_user)):
    ensure_profile_access(user,patient_id)
    if not get_memory(patient_id,memory_id): raise HTTPException(status_code=404,detail="Memory not found.")
    allowed={"photo":{"image/jpeg":".jpg","image/png":".png","image/webp":".webp"},"audio":{"audio/mpeg":".mp3","audio/wav":".wav","audio/x-wav":".wav","audio/ogg":".ogg","audio/webm":".webm","audio/mp4":".m4a"}}
    content_type=(file.content_type or "").lower()
    if content_type not in allowed[kind]: raise HTTPException(status_code=415,detail=f"Unsupported {kind} file type.")
    max_size=5*1024*1024 if kind=="photo" else 12*1024*1024
    content=await file.read(max_size+1)
    if not content or len(content)>max_size: raise HTTPException(status_code=413,detail=f"{kind.title()} file is empty or too large.")
    filename=f"{uuid4().hex}{allowed[kind][content_type]}"; (UPLOAD_DIR/filename).write_bytes(content)
    field="photo_path" if kind=="photo" else "audio_path"; relative_path=f"/api/media/{filename}"
    update_memory_media(patient_id,memory_id,field,relative_path)
    return {"status":"success","kind":kind,"url":relative_path}


@app.get("/api/media/{filename}")
def private_media(filename: str,user: dict=Depends(current_user)):
    # Serve a file only if a memory containing its path belongs to this signed-in family account.
    if Path(filename).name != filename: raise HTTPException(status_code=404,detail="Media not found.")
    conn=get_db()
    row=conn.execute("""SELECT m.photo_path,m.audio_path FROM memories m JOIN patient_profiles p ON p.id=m.patient_id
        WHERE p.user_id=? AND (m.photo_path=? OR m.audio_path=?) LIMIT 1""",(user["id"],f"/api/media/{filename}",f"/api/media/{filename}")).fetchone()
    conn.close()
    path=UPLOAD_DIR/filename
    if not row or not path.is_file(): raise HTTPException(status_code=404,detail="Media not found.")
    return FileResponse(path,media_type=guess_type(filename)[0] or "application/octet-stream")


@app.delete("/api/patient/{patient_id}/memories/{memory_id}")
def remove_memory(patient_id: str,memory_id: int,user: dict=Depends(current_user)):
    ensure_profile_access(user,patient_id)
    if not delete_memory(patient_id,memory_id): return {"status":"not_found","message":"Memory not found."}
    return {"status":"success","message":"Memory removed."}


@app.get("/api/patient/{patient_id}/memory-network")
def get_memory_network(patient_id: str, user: dict = Depends(current_user)):
    """Return only this profile's memories and explicitly-created relationships."""
    ensure_profile_access(user, patient_id)
    conn = get_db()
    memories = conn.execute(
        "SELECT id,title,category,person_name,relationship,place,event_name,memory_year,importance FROM memories WHERE patient_id=? ORDER BY importance DESC, updated_at DESC",
        (patient_id,)
    ).fetchall()
    links = conn.execute(
        "SELECT l.id,l.source_memory_id,l.target_memory_id,l.relationship_label,l.created_at FROM memory_links l WHERE l.patient_id=? ORDER BY l.id DESC",
        (patient_id,)
    ).fetchall()
    conn.close()
    return {"status":"success","memories":[dict(r) for r in memories],"links":[dict(r) for r in links]}


@app.post("/api/patient/{patient_id}/memory-network/links")
def create_memory_link(patient_id: str, link: MemoryLinkCreate, user: dict = Depends(current_user)):
    ensure_profile_access(user, patient_id)
    if link.patient_id != patient_id:
        raise HTTPException(status_code=400, detail="Profile does not match this connection.")
    if link.source_memory_id == link.target_memory_id:
        raise HTTPException(status_code=400, detail="Choose two different memories.")
    conn = get_db()
    ids = {r["id"] for r in conn.execute(
        "SELECT id FROM memories WHERE patient_id=? AND id IN (?,?)",
        (patient_id, link.source_memory_id, link.target_memory_id)
    ).fetchall()}
    if ids != {link.source_memory_id, link.target_memory_id}:
        conn.close()
        raise HTTPException(status_code=404, detail="One or both memories were not found in this profile.")
    try:
        cur = conn.execute(
            "INSERT INTO memory_links(patient_id,source_memory_id,target_memory_id,relationship_label,created_at) VALUES(?,?,?,?,?)",
            (patient_id, link.source_memory_id, link.target_memory_id, link.relationship_label.strip(), __import__("datetime").datetime.now().isoformat())
        )
        conn.commit()
        link_id = cur.lastrowid
    except Exception as exc:
        conn.close()
        if "UNIQUE" in str(exc):
            raise HTTPException(status_code=409, detail="These memories are already connected in this direction.")
        raise
    conn.close()
    return {"status":"success","link_id":link_id,"message":"Memory connection saved."}


@app.delete("/api/patient/{patient_id}/memory-network/links/{link_id}")
def delete_memory_link(patient_id: str, link_id: int, user: dict = Depends(current_user)):
    ensure_profile_access(user, patient_id)
    conn = get_db()
    cur = conn.execute("DELETE FROM memory_links WHERE id=? AND patient_id=?", (link_id, patient_id))
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Connection not found.")
    return {"status":"success","message":"Memory connection removed."}


@app.get("/api/patient/{patient_id}/memory-insights")
def get_memory_insights(patient_id: str, user: dict = Depends(current_user)):
    """Non-clinical caregiver overview of saved-memory patterns and activity."""
    ensure_profile_access(user, patient_id)
    conn = get_db()
    counts = conn.execute("SELECT category,COUNT(*) AS total FROM memories WHERE patient_id=? GROUP BY category ORDER BY total DESC", (patient_id,)).fetchall()
    links = conn.execute("SELECT COUNT(*) AS total FROM memory_links WHERE patient_id=?", (patient_id,)).fetchone()["total"]
    top = conn.execute("SELECT title,category,importance FROM memories WHERE patient_id=? ORDER BY importance DESC,updated_at DESC LIMIT 5", (patient_id,)).fetchall()
    activity = conn.execute("SELECT COUNT(*) AS total FROM game_results WHERE patient_id=?", (patient_id,)).fetchone()["total"]
    conn.close()
    return {"status":"success","memory_count":sum(r["total"] for r in counts),
            "category_counts":[dict(r) for r in counts],"connection_count":links,
            "important_memories":[dict(r) for r in top],"activity_sessions":activity,
            "note":"These are saved-content and activity summaries, not clinical assessments."}


@app.get("/api/patient/{patient_id}/memory-cues")
def get_contextual_memory_cues(patient_id: str, activity: str | None = Query(default=None, max_length=60), user: dict = Depends(current_user)):
    """Gentle cues drawn only from memories deliberately saved by the family."""
    ensure_profile_access(user, patient_id)
    conn = get_db()
    rows = conn.execute(
        "SELECT title,category,person_name,relationship,place,event_name,memory_year,story,cue,importance FROM memories WHERE patient_id=? ORDER BY importance DESC,updated_at DESC LIMIT 5",
        (patient_id,)
    ).fetchall()
    conn.close()
    cues = []
    for row in rows:
        item = dict(row)
        parts = [item["title"]]
        if item.get("person_name"):
            parts.append(item["person_name"])
        if item.get("place"):
            parts.append(item["place"])
        if item.get("event_name"):
            parts.append(item["event_name"])
        cues.append({"title":item["title"],"category":item["category"],
                     "prompt":"Would you like to revisit this memory?" if item.get("cue") else "Here is a memory your family saved.",
                     "context":" · ".join(parts),"cue":item.get("cue")})
    return {"status":"success","activity":activity,"cues":cues,
            "note":"Optional supportive prompts only; they do not identify people or assess memory ability."}


@app.post("/api/mood")
def record_mood(mood: MoodCreate,user: dict=Depends(current_user)):
    ensure_profile_access(user,mood.patient_id)
    entry_id=save_mood(mood.patient_id,mood.mood)
    return {"status":"success","entry_id":entry_id,"mood":mood.mood}


# ---------------- Phase 4: forecast, reminiscence, demo seed ----------------
@app.get("/api/patient/{patient_id}/forecast")
def get_forecast(patient_id: str, user: dict = Depends(current_user)):
    """Statistical trend + 3-session projection from in-app activity. Non-diagnostic."""
    ensure_profile_access(user, patient_id)
    conn = get_db()
    rows = conn.execute("SELECT game_type,accuracy,response_time,hints,created_at FROM game_results WHERE patient_id=? ORDER BY created_at ASC LIMIT 60", (patient_id,)).fetchall()
    conn.close()
    return {"status": "success", **build_forecast([dict(r) for r in rows])}


@app.get("/api/patient/{patient_id}/reminiscence")
def get_reminiscence(patient_id: str, user: dict = Depends(current_user)):
    """Gentle conversation starters built only from memories the family saved."""
    ensure_profile_access(user, patient_id)
    mems = [dict(r) for r in get_memories(patient_id, limit=20)]
    mems.sort(key=lambda m: m.get("importance") or 0, reverse=True)
    return {"status": "success", "prompts": reminiscence_prompts(mems),
            "note": "Open-ended conversation starters, not a memory test."}


@app.get("/api/patient/{patient_id}/weekly-summary")
def get_weekly_summary(patient_id: str, user: dict = Depends(current_user)):
    ensure_profile_access(user, patient_id)
    conn = get_db()
    data = weekly_summary(conn, patient_id); conn.close()
    return {"status": "success", **data}


@app.post("/api/patient/{patient_id}/demo-seed")
def seed_demo(patient_id: str, user: dict = Depends(current_user)):
    """Adds 21 days of FICTIONAL activity for demonstrations. Only allowed on a profile with <5 sessions."""
    ensure_profile_access(user, patient_id)
    conn = get_db()
    existing = conn.execute("SELECT COUNT(*) AS c FROM game_results WHERE patient_id=?", (patient_id,)).fetchone()["c"]
    if existing >= 5:
        conn.close()
        raise HTTPException(status_code=409, detail="Demo data can only be added to a profile with fewer than 5 sessions.")
    for r in demo_sessions():
        conn.execute("INSERT INTO game_results (patient_id,game_type,difficulty,score,accuracy,response_time,moves,hints,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
                     (patient_id, r["game_type"], r["difficulty"], r["score"], r["accuracy"], r["response_time"], r["moves"], r["hints"], r["created_at"]))
    conn.commit(); conn.close()
    return {"status": "success", "message": "Fictional demo activity added (21 sessions)."}


@app.get("/api/care-centre/overview")
def care_centre_overview(user: dict = Depends(current_user)):
    """One-screen overview of every profile in the account (care-home / family-with-several-elders view)."""
    conn = get_db(); out = []
    for p in list_profiles(user["id"]):
        pid = p["id"]
        rows = [dict(r) for r in conn.execute("SELECT game_type,accuracy,response_time,hints,created_at FROM game_results WHERE patient_id=? ORDER BY created_at ASC LIMIT 60", (pid,)).fetchall()]
        f = build_forecast(rows)
        mood = conn.execute("SELECT mood FROM mood_entries WHERE patient_id=? ORDER BY created_at DESC LIMIT 1", (pid,)).fetchone()
        mem = conn.execute("SELECT COUNT(*) c FROM memories WHERE patient_id=?", (pid,)).fetchone()["c"]
        out.append({"id": pid, "name": p["display_name"], "relationship": p["relationship"], "sessions": len(rows),
                    "last_activity": rows[-1]["created_at"] if rows else None, "status": f["status"], "label": f["label"],
                    "recent": f.get("recent"), "latest_mood": mood["mood"] if mood else None, "memories": mem})
    conn.close()
    order = {"attention": 0, "insufficient_data": 1, "steady": 2, "improving": 3}
    out.sort(key=lambda x: order.get(x["status"], 9))
    return {"status": "success", "count": len(out), "profiles": out, "limit": 25,
            "note": "Activity summaries only; not a clinical assessment."}


app.mount("/",StaticFiles(directory=str(FRONTEND_DIR),html=True),name="frontend")
