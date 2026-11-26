# SMRITI

SMRITI is an assistive memory-support platform with cognitive activities, caregiver insights, mood check-ins and a contextual personal-memory layer. Its current adaptive recommendations are rule-based, not a trained machine-learning model.

## Current stack
- Frontend: HTML, CSS, JavaScript
- Backend: Python, FastAPI
- Data: SQLite
- Adaptive engine: Python rule-based personalization
- Browser capability: Speech Synthesis API for optional voice guidance

## Run locally

From the project root:

```bash
python -m venv .venv
# Windows
.venv\\Scripts\\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Open `http://127.0.0.1:8000/`.

## Main flows
- Elder Mode: daily activities, adaptive recommendations, mood check-in, progress, reminders, help, voice support and Memory Moments.
- Caregiver Mode: performance summary, activity history, trend, adaptive recommendation, AI insight, report and Memory Library.
- Cognitive activities: Memory Garden, Focus & Find and My Daily Story.
- Personal Memory Vault: create, view, edit, search, filter and delete contextual memories linked to people, relationships, places, events, stories and cues.
- Memory media: attach one photograph and one audio file to a memory (JPG/PNG/WebP up to 5 MB; supported audio up to 12 MB).
- Memory metadata: add related people and searchable tags.
- Personal Memory API: `GET /api/patient/{patient_id}/memories?search=&category=`, `POST /api/memories`, `PUT /api/patient/{patient_id}/memories/{memory_id}`, `POST /api/patient/{patient_id}/memories/{memory_id}/media?kind=photo|audio`, and `DELETE /api/patient/{patient_id}/memories/{memory_id}`.

## Architecture

User → HTML/CSS/JS → REST API → FastAPI/Python → SQLite + adaptive engine → response → UI

The personal-memory layer is additive: it does not replace the existing cognitive-activity analytics. Existing SQLite databases are upgraded additively at startup with optional media and metadata columns; existing memory and activity records are preserved.

## Important positioning
SMRITI is an assistive memory-support and cognitive-activity prototype. Its activity scores and adaptive recommendations are not a clinical diagnosis and should not be presented as one.

## Demo and privacy limitations
- The current browser interface uses the fixed `demo-patient-001` profile. It is suitable for a controlled demonstration with fictional data only.
- User registration, sign-in, caregiver-patient authorization and production-grade access controls are not implemented yet. Do not store real sensitive personal or health information in this demo build or expose it publicly.
- Uploaded media is stored locally in `backend/uploads`; production deployment will require private object storage, authenticated access, retention/deletion controls, backups and security review.
- Media uploads accept JPEG, PNG and WebP images (5 MB maximum) and selected audio formats (12 MB maximum). The server checks declared MIME type and file size; production deployment should add content-signature scanning and malware checks.
- The app is not a medical device, diagnostic system or replacement for professional care.

## Memory Vault update
The Memory Vault now supports editing existing memories, search, category filtering, related-people notes, tags, and optional photo/audio attachments. The database changes are additive and preserve the original tables and records.

## Family accounts and private profiles (Phase 2 pilot)
- Family account registration and sign-in use password hashing (PBKDF2-HMAC-SHA256) and random server-side sessions; only a hash of each session token is stored in SQLite.
- Session cookies are HttpOnly and SameSite=Lax. The local-development cookie is not marked Secure because the demo runs over HTTP; production must use HTTPS and Secure cookies.
- Each account receives a private default memory profile and can create up to 25 profiles in this pilot. API routes verify that the signed-in account owns the requested profile.
- Memory photos/audio are served through an authenticated media endpoint rather than a public static uploads directory.
- The first account created in a local database receives copies of the generic legacy demo records under its private profile; original demo records remain untouched. These are fictional starter examples.
- The browser keeps the selected profile ID locally; the server independently checks profile ownership on every protected API request.

### Phase 2 limitations – not production-ready
- No email verification, password-reset workflow, account recovery, caregiver invitation/linking, multi-factor authentication, or administrator console yet.
- No automated login rate limiting or account lockout yet.
- Local SQLite and local media storage are for a controlled pilot only. Production requires HTTPS, Secure cookies, private object storage, encrypted backups, monitoring, retention/deletion policies, vulnerability review and operational support.
- The password is stored as a PBKDF2 hash, never as plaintext. Users should use a unique password during this pilot.
- Existing activity logic remains rule-based; no clinical effectiveness or diagnosis claim is made.


## Phase 3 – Connected Memory Experience (v1.3.0)
- Add explicit links between two memories with a family-defined relationship label (for example, "Anita — daughter of — Family Wedding").
- View and remove connections without deleting the underlying memories.
- Connected-memory data is scoped to the selected private profile; the API verifies ownership of both memories before creating a link.
- Optional contextual prompts are generated only from information already saved by the family. They are invitations to revisit a memory, not identity recognition or cognitive assessment.
- Caregiver Memory Library Insights summarize saved-memory counts by category, connection counts and recorded activity sessions.
- The existing adaptive recommendation engine remains rule-based; Phase 3 does not claim trained ML or clinical effectiveness.

### Phase 3 API
- `GET /api/patient/{patient_id}/memory-network`
- `POST /api/patient/{patient_id}/memory-network/links`
- `DELETE /api/patient/{patient_id}/memory-network/links/{link_id}`
- `GET /api/patient/{patient_id}/memory-insights`
- `GET /api/patient/{patient_id}/memory-cues`

The `memory_links` table is created additively at startup. Existing tables, memories, accounts, sessions and media are retained.

## Phase 4 – Trend insights and business model (v1.4.0)
- `GET /api/patient/{id}/forecast`: composite activity score, exponential moving average, least-squares trend and 3-session projection compared with the person's own baseline. Statistical and non-diagnostic.
- `GET /api/patient/{id}/reminiscence`: open-ended conversation starters built only from family-saved memories.
- `POST /api/patient/{id}/demo-seed`: adds 21 days of fictional activity (only to profiles with fewer than 5 sessions) for demonstrations.
- Caregiver dashboard: new "Activity Trend & Early Check-in Flag" and "Reminiscence Conversation Starters" panels (`forecast.js`).
- `/business.html`: Pitch Fest business model (operations, marketing, HR, finance with live profit calculator, Q&A). Figures are planning estimates.


## Phase 3 (Intelligent Personal Memory Experience) – v1.5.0
- **Hindi + English**: `i18n.js` translates the elder-facing pages (switch with the floating EN/हिं button or the home-page language menu). New features are bilingual; Hindi voice (hi-IN) is used for read-aloud when the browser provides it.
- **Voice assistant** (`voice.js`): tap 🎙️ and speak, or type. Commands: open reminders/games/memories/progress/help, "remind me to drink water at 5 pm" (creates a reminder), read my reminders, time/date, and mood ("I feel sad"). Hindi commands work too (e.g. "शाम 6 बजे दवा की याद दिलाओ"). Requires a browser with Web Speech API (Chrome/Edge); typed commands work everywhere.
- **Reminder alerts** (`reminder-alerts.js`): at the reminder time a large card appears, is read aloud, and offers Done / Snooze 10 min. Family reminders show a saved memory cue.
- **Memory Cues activity** (`memory-quiz.html`): a gentle, no-fail activity built from family-saved memories ("Who is part of this memory?"). Results are saved as `memory_cues` and feed adaptive recommendations.
- **Adaptive recommendations**: if the latest mood is Sad or recent accuracy is low and at least two memories are saved, SMRITI recommends Memory Cues (rule-based, non-clinical).
- **Caregiver insights**: `GET /api/patient/{id}/weekly-summary` returns an English and Hindi plain-language weekly summary, shown on the caregiver dashboard.
- Limitations: Hindi translation covers the main elder-facing screens, not every caregiver screen; speech recognition quality depends on the browser; alerts fire only while a SMRITI page is open (no background push notifications yet).

## Care Centre overview and plans (v1.6.0)
- `GET /api/care-centre/overview` + `/care-centre.html`: one table of every profile in the account (sessions, last activity, recent score, mood, memories, trend status). Profiles worth a gentle check-in are listed first. Pilot limit: 25 profiles per account.
- Home page now shows the Free / Family ₹199 / Care Centre ₹1,499 plans (display only; no payment is collected in this demo).
- The home-page "Talk to SMRITI" button now opens the voice assistant.
- Every inner page now has a consistent Back + Home button (`nav.js`).
