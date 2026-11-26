import sqlite3
from datetime import datetime
from pathlib import Path

DATABASE = Path(__file__).resolve().parent / "smriti.db"


def get_db():
    conn = sqlite3.connect(str(DATABASE))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS game_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            game_type TEXT NOT NULL,
            difficulty TEXT,
            score REAL,
            accuracy REAL,
            response_time REAL,
            moves INTEGER,
            hints INTEGER,
            created_at TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            person_name TEXT,
            relationship TEXT,
            place TEXT,
            event_name TEXT,
            memory_year INTEGER,
            story TEXT,
            cue TEXT,
            importance INTEGER DEFAULT 3,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS mood_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            mood TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
            password_hash TEXT NOT NULL, created_at TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patient_profiles (
            id TEXT PRIMARY KEY, user_id TEXT NOT NULL, display_name TEXT NOT NULL,
            relationship TEXT NOT NULL, created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_profiles_user ON patient_profiles(user_id)")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)")
    # Additive migrations keep existing SMRITI databases and records intact.
    existing_columns = {row[1] for row in cursor.execute("PRAGMA table_info(memories)").fetchall()}
    for column, definition in {
        "photo_path": "TEXT",
        "audio_path": "TEXT",
        "tags": "TEXT",
        "related_people": "TEXT",
    }.items():
        if column not in existing_columns:
            cursor.execute(f"ALTER TABLE memories ADD COLUMN {column} {definition}")

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_game_results_patient_time ON game_results(patient_id, created_at DESC)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_patient ON memories(patient_id, importance DESC, updated_at DESC)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_mood_patient_time ON mood_entries(patient_id, created_at DESC)")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS memory_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            source_memory_id INTEGER NOT NULL,
            target_memory_id INTEGER NOT NULL,
            relationship_label TEXT NOT NULL DEFAULT 'Related to',
            created_at TEXT NOT NULL,
            UNIQUE(patient_id, source_memory_id, target_memory_id),
            CHECK(source_memory_id <> target_memory_id),
            FOREIGN KEY(source_memory_id) REFERENCES memories(id) ON DELETE CASCADE,
            FOREIGN KEY(target_memory_id) REFERENCES memories(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_links_profile ON memory_links(patient_id)")
    conn.commit()
    conn.close()


def save_game_result(result):
    conn = get_db()
    cursor = conn.cursor()
    created_at = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO game_results
        (patient_id, game_type, difficulty, score, accuracy, response_time, moves, hints, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (result.patient_id, result.game_type, result.difficulty, result.score,
          result.accuracy, result.response_time, result.moves, result.hints, created_at))
    conn.commit()
    result_id = cursor.lastrowid
    conn.close()
    return result_id


def get_recent_results(patient_id, limit=5):
    conn = get_db()
    rows = conn.execute("""
        SELECT score, accuracy, response_time, difficulty, game_type, created_at
        FROM game_results WHERE patient_id = ?
        ORDER BY created_at DESC LIMIT ?
    """, (patient_id, limit)).fetchall()
    conn.close()
    return rows


def get_memories(patient_id, limit=100, search=None, category=None):
    conn = get_db()
    clauses = ["patient_id = ?"]
    params = [patient_id]
    if category and category.lower() != "all":
        clauses.append("LOWER(category) = LOWER(?)")
        params.append(category)
    if search:
        clauses.append("(title LIKE ? OR person_name LIKE ? OR relationship LIKE ? OR place LIKE ? OR event_name LIKE ? OR story LIKE ? OR cue LIKE ? OR tags LIKE ?)")
        term = f"%{search}%"
        params.extend([term] * 8)
    params.append(limit)
    rows = conn.execute(f"""
        SELECT * FROM memories WHERE {' AND '.join(clauses)}
        ORDER BY importance DESC, updated_at DESC LIMIT ?
    """, params).fetchall()
    conn.close()
    return rows


def get_memory(patient_id, memory_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM memories WHERE id = ? AND patient_id = ?", (memory_id, patient_id)).fetchone()
    conn.close()
    return row


def create_memory(memory):
    conn = get_db()
    now = datetime.now().isoformat()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO memories
        (patient_id, title, category, person_name, relationship, place,
         event_name, memory_year, story, cue, importance, tags, related_people, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (memory.patient_id, memory.title, memory.category, memory.person_name,
          memory.relationship, memory.place, memory.event_name, memory.memory_year,
          memory.story, memory.cue, memory.importance, memory.tags, memory.related_people, now, now))
    conn.commit()
    memory_id = cursor.lastrowid
    conn.close()
    return memory_id


def update_memory(patient_id, memory_id, memory):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE memories SET title=?, category=?, person_name=?, relationship=?, place=?,
            event_name=?, memory_year=?, story=?, cue=?, importance=?, tags=?,
            related_people=?, updated_at=?
        WHERE id=? AND patient_id=?
    """, (memory.title, memory.category, memory.person_name, memory.relationship,
          memory.place, memory.event_name, memory.memory_year, memory.story, memory.cue,
          memory.importance, memory.tags, memory.related_people,
          datetime.now().isoformat(), memory_id, patient_id))
    conn.commit()
    changed = cursor.rowcount > 0
    conn.close()
    return changed


def update_memory_media(patient_id, memory_id, field, path):
    if field not in {"photo_path", "audio_path"}:
        raise ValueError("Unsupported media field")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"UPDATE memories SET {field}=?, updated_at=? WHERE id=? AND patient_id=?",
                   (path, datetime.now().isoformat(), memory_id, patient_id))
    conn.commit()
    changed = cursor.rowcount > 0
    conn.close()
    return changed


def delete_memory(patient_id, memory_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM memories WHERE id = ? AND patient_id = ?", (memory_id, patient_id))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


def save_mood(patient_id, mood):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO mood_entries (patient_id, mood, created_at) VALUES (?, ?, ?)",
                   (patient_id, mood, datetime.now().isoformat()))
    conn.commit()
    entry_id = cursor.lastrowid
    conn.close()
    return entry_id


def get_latest_mood(patient_id):
    conn = get_db()
    row = conn.execute("""
        SELECT mood, created_at FROM mood_entries
        WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1
    """, (patient_id,)).fetchone()
    conn.close()
    return row
