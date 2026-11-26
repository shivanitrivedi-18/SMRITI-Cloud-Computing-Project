# =========================================================
# SMRITI INSIGHTS ENGINE (Phase 4)
# Statistical trend forecasting, caregiver attention flags,
# reminiscence prompts and fictional demo-data seeding.
# Pure Python (no extra dependencies). Non-diagnostic by design.
# =========================================================
from datetime import datetime, timedelta
from statistics import mean, median
import random

DISCLAIMER = ("Statistical summary of in-app activity only. It is not a diagnosis or clinical "
              "assessment; please consult a doctor for any health concern.")


def _clamp(v, lo=0.0, hi=100.0):
    return max(lo, min(hi, v))


def composite_scores(rows):
    """rows: dicts ordered oldest -> newest. Returns per-session composite 0-100.
    composite = 70% accuracy + 15% independence (fewer hints) + 15% speed vs the person's own baseline."""
    rts = [r["response_time"] for r in rows[:5] if r.get("response_time")]
    baseline_rt = median(rts) if rts else None
    out = []
    for r in rows:
        acc = r.get("accuracy") or 0
        hints = r.get("hints") or 0
        independence = _clamp(100 - hints * 12)
        rt = r.get("response_time")
        speed = _clamp(100 * baseline_rt / rt) if (baseline_rt and rt) else 70
        out.append(round(0.70 * acc + 0.15 * independence + 0.15 * speed, 1))
    return out


def ewma(values, alpha=0.3):
    s, out = None, []
    for v in values:
        s = v if s is None else alpha * v + (1 - alpha) * s
        out.append(round(s, 1))
    return out


def linear_fit(values):
    """Ordinary least squares on index -> value. Returns slope, intercept, r2."""
    n = len(values)
    if n < 2:
        return 0.0, (values[0] if values else 0.0), 0.0
    xs = list(range(n))
    mx, my = mean(xs), mean(values)
    sxx = sum((x - mx) ** 2 for x in xs)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, values))
    slope = sxy / sxx if sxx else 0.0
    intercept = my - slope * mx
    ss_tot = sum((y - my) ** 2 for y in values)
    ss_res = sum((y - (intercept + slope * x)) ** 2 for x, y in zip(xs, values))
    r2 = 1 - ss_res / ss_tot if ss_tot else 0.0
    return slope, intercept, _clamp(r2, 0, 1)


def build_forecast(rows):
    """rows: list of dict (oldest -> newest)."""
    n = len(rows)
    if n < 5:
        return {"status": "insufficient_data", "label": "Collecting data",
                "message": f"{n} of 5 sessions recorded. A trend appears after 5 sessions.",
                "sessions": n, "series": [], "forecast": [], "games": [], "disclaimer": DISCLAIMER}

    scores = composite_scores(rows)
    smooth = ewma(scores)
    window = scores[-10:]
    slope, intercept, r2 = linear_fit(window)
    baseline = mean(scores[:5])
    recent = mean(scores[-5:])
    delta = recent - baseline

    if slope <= -1.5 and delta <= -6:
        status, label = "attention", "Worth a check-in"
        message = ("Recent activity scores are lower than this person's own early baseline and still "
                   "trending down. This can be due to tiredness, mood, medication or a bad day — "
                   "consider a gentle conversation, and speak to a doctor if it continues.")
    elif slope >= 1.0 and delta >= 3:
        status, label = "improving", "Improving"
        message = "Activity scores are trending up compared with the earlier baseline. Keep the routine going."
    else:
        status, label = "steady", "Steady"
        message = "Activity scores are stable compared with the earlier baseline."

    last = smooth[-1]
    forecast = [round(_clamp(last + slope * k), 1) for k in (1, 2, 3)]
    confidence = int(round(_clamp(min(1, len(window) / 10) * 50 + r2 * 50, 10, 95)))

    games = {}
    for r in rows:
        games.setdefault(r["game_type"], []).append(r.get("accuracy") or 0)
    game_stats = [{"game": g, "sessions": len(v), "avg_accuracy": round(mean(v), 1),
                   "latest_accuracy": round(v[-1], 1)} for g, v in games.items()]
    game_stats.sort(key=lambda x: x["avg_accuracy"])

    suggestion = None
    if game_stats:
        weakest = game_stats[0]
        suggestion = f"Spend a little more gentle practice on '{weakest['game'].replace('_', ' ')}' (lowest average accuracy)."

    return {"status": status, "label": label, "message": message, "sessions": n,
            "baseline": round(baseline, 1), "recent": round(recent, 1), "change": round(delta, 1),
            "slope_per_session": round(slope, 2), "confidence": confidence,
            "series": [{"score": s, "smoothed": m, "at": r.get("created_at")}
                       for s, m, r in zip(scores, smooth, rows)],
            "forecast": forecast, "games": game_stats, "suggestion": suggestion,
            "method": "Composite score + exponential moving average + least-squares trend (statistical, not clinical)",
            "disclaimer": DISCLAIMER}


def reminiscence_prompts(memories, limit=5):
    """Open-ended, non-testing conversation starters built only from family-saved memories."""
    out = []
    for m in memories[:limit]:
        qs = []
        who = m.get("person_name")
        if who:
            qs.append(f"What do you enjoy remembering about {who}?")
        if m.get("place"):
            qs.append(f"What did {m['place']} look and smell like?")
        if m.get("event_name"):
            qs.append(f"Tell me about {m['event_name']} — who was there?")
        if m.get("cue"):
            qs.append(f"Does '{m['cue']}' remind you of anything nice?")
        if not qs:
            qs.append(f"Would you like to talk about '{m['title']}'?")
        out.append({"memory_id": m.get("id"), "title": m["title"], "photo": m.get("photo_path"),
                    "audio": m.get("audio_path"), "questions": qs[:3]})
    return out


def demo_sessions(days=21, seed=7):
    """Fictional sessions: a mostly stable person with a mild dip in the most recent week."""
    rnd = random.Random(seed)
    games = ["memory_garden", "focus_find", "daily_routine"]
    now = datetime.now()
    rows = []
    for i in range(days):
        when = now - timedelta(days=days - i, hours=rnd.randint(0, 3))
        base = 78 - (max(0, i - (days - 7)) * 2.2)  # dip in final 7 days
        g = games[i % 3]
        acc = _clamp(base + rnd.uniform(-5, 5) - (4 if g == "focus_find" else 0))
        rows.append({"game_type": g, "difficulty": "easy" if acc < 65 else "medium",
                     "score": round(acc - rnd.uniform(0, 4), 1), "accuracy": round(acc, 1),
                     "response_time": round(rnd.uniform(3.0, 5.0) + max(0, i - (days - 7)) * 0.25, 1),
                     "moves": rnd.randint(8, 16), "hints": rnd.choice([0, 0, 1, 1, 2]) + (1 if i > days - 5 else 0),
                     "created_at": when.isoformat()})
    return rows


# ---------------- Phase 3 (Intelligent Personal Memory Experience) ----------------
def _days_ago(n):
    return (datetime.now() - timedelta(days=n)).isoformat()


def weekly_summary(conn, patient_id):
    """Plain-language weekly family summary (English + Hindi). Activity/content summary only."""
    def one(q, *a):
        return conn.execute(q, a).fetchone()
    this = one("SELECT COUNT(*) c, AVG(accuracy) a FROM game_results WHERE patient_id=? AND created_at>=?", patient_id, _days_ago(7))
    prev = one("SELECT COUNT(*) c, AVG(accuracy) a FROM game_results WHERE patient_id=? AND created_at>=? AND created_at<?", patient_id, _days_ago(14), _days_ago(7))
    fav = one("SELECT game_type g, COUNT(*) c FROM game_results WHERE patient_id=? AND created_at>=? GROUP BY game_type ORDER BY c DESC LIMIT 1", patient_id, _days_ago(7))
    moods = conn.execute("SELECT mood, COUNT(*) c FROM mood_entries WHERE patient_id=? AND created_at>=? GROUP BY mood ORDER BY c DESC", (patient_id, _days_ago(7))).fetchall()
    new_mem = one("SELECT COUNT(*) c FROM memories WHERE patient_id=? AND created_at>=?", patient_id, _days_ago(7))["c"]
    links = one("SELECT COUNT(*) c FROM memory_links WHERE patient_id=?", patient_id)["c"]
    n, pn = this["c"], prev["c"]
    acc = round(this["a"], 1) if this["a"] is not None else None
    pacc = round(prev["a"], 1) if prev["a"] is not None else None
    en, hi = [], []
    names = {"memory_garden": ("Memory Garden", "मेमोरी गार्डन"), "focus_find": ("Focus & Find", "फोकस एंड फाइंड"),
             "daily_routine": ("My Daily Story", "मेरी रोज़ की कहानी"), "memory_cues": ("Memory Cues", "यादों के संकेत")}
    if n == 0:
        en.append("No activities were completed in the last 7 days. A short, friendly session together may help.")
        hi.append("पिछले 7 दिनों में कोई गतिविधि पूरी नहीं हुई। साथ बैठकर एक छोटी, सहज गतिविधि मदद कर सकती है।")
    else:
        en.append(f"{n} activit{'y' if n == 1 else 'ies'} completed this week" + (f" (last week: {pn})." if pn else "."))
        hi.append(f"इस सप्ताह {n} गतिविधियाँ पूरी हुईं" + (f" (पिछले सप्ताह: {pn})।" if pn else "।"))
        if acc is not None and pacc is not None:
            d = round(acc - pacc, 1)
            word_en = "higher" if d > 2 else "lower" if d < -2 else "about the same"
            word_hi = "अधिक" if d > 2 else "कम" if d < -2 else "लगभग समान"
            en.append(f"Average accuracy was {acc}%, {word_en} than last week ({pacc}%).")
            hi.append(f"औसत सटीकता {acc}% रही, जो पिछले सप्ताह ({pacc}%) से {word_hi} है।")
        elif acc is not None:
            en.append(f"Average accuracy was {acc}%."); hi.append(f"औसत सटीकता {acc}% रही।")
        if fav:
            g = names.get(fav["g"], (fav["g"], fav["g"]))
            en.append(f"Most played: {g[0]}."); hi.append(f"सबसे ज़्यादा खेली गई: {g[1]}।")
    mood_hi = {"Happy": "खुश", "Good": "अच्छा", "Okay": "ठीक", "Sad": "उदास"}
    if moods:
        top = moods[0]
        en.append(f"Most common mood check-in: {top['mood']} ({top['c']} time{'s' if top['c'] != 1 else ''}).")
        hi.append(f"सबसे आम मूड: {mood_hi.get(top['mood'], top['mood'])} ({top['c']} बार)।")
    if new_mem:
        en.append(f"{new_mem} new memor{'y was' if new_mem == 1 else 'ies were'} added to the Memory Vault.")
        hi.append(f"मेमोरी वॉल्ट में {new_mem} नई याद जोड़ी गई।")
    if links:
        en.append(f"{links} family memory connection{'s' if links != 1 else ''} saved so far.")
        hi.append(f"अब तक {links} पारिवारिक याद-संबंध सहेजे गए हैं।")
    return {"sessions_this_week": n, "sessions_last_week": pn, "accuracy_this_week": acc, "accuracy_last_week": pacc,
            "new_memories": new_mem, "connections": links, "summary_en": en, "summary_hi": hi,
            "note": "Activity and content summary only; not a clinical assessment."}


def enrich_with_memory(rec, conn, patient_id):
    """Adaptive recommendation add-on: suggest a comforting memory-cue activity when the latest mood is Sad
    or recent accuracy is low, and the family has saved at least 2 memories. Rule-based and non-clinical."""
    mem = conn.execute("SELECT title FROM memories WHERE patient_id=? ORDER BY importance DESC, updated_at DESC LIMIT 1", (patient_id,)).fetchone()
    count = conn.execute("SELECT COUNT(*) c FROM memories WHERE patient_id=?", (patient_id,)).fetchone()["c"]
    mood = conn.execute("SELECT mood FROM mood_entries WHERE patient_id=? ORDER BY created_at DESC LIMIT 1", (patient_id,)).fetchone()
    rec = dict(rec)
    rec["memory_cue"] = mem["title"] if mem else None
    low = (rec.get("latest_accuracy") or 0) and rec.get("latest_accuracy") < 55
    sad = bool(mood and mood["mood"] == "Sad")
    if count >= 2 and (sad or low):
        rec["next_activity"] = "memory_cues"
        rec["reason"] = ("Your family's saved memories can be a comforting, low-pressure activity right now."
                         if sad else "A gentle activity with familiar memories may feel easier today.")
        rec["message"] = "Let's revisit some happy memories together. 🌸"
    return rec
