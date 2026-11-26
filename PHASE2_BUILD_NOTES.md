# SMRITI Phase 2 – Family Accounts & Privacy Foundation

## Implemented
- Family account registration and sign-in.
- Password hashing using PBKDF2-HMAC-SHA256 (310,000 iterations).
- Random server-side sessions; only SHA-256 hashes of session tokens are stored.
- HttpOnly, SameSite=Lax session cookie; logout revokes the server-side session.
- Private memory profiles owned by a family account; up to 10 profiles in this pilot.
- Profile ownership checks on memory, game-result, mood, history, trend, summary, adaptive recommendation and media API routes.
- Existing fixed demo profile IDs in the current frontend are transparently mapped to the selected private profile by the shared auth controller.
- Profile switching and adding profiles from the account bar.
- Authenticated media delivery; the former public `/uploads` static mount has been removed.
- Existing generic demo records are copied into the first registered account's private default profile; the original demo records remain in place.
- Existing app modules and Phase 1 Memory Vault functions remain in the project.

## Validation performed
- Python backend compilation.
- JavaScript syntax check for every frontend JS file.
- Unauthenticated protected API requests return 401.
- Registration and session cookie.
- Default profile creation and listing.
- Add/search memory under the authenticated profile.
- Additional profile creation.
- Cross-account profile access denied (404).
- Authenticated media upload and owner retrieval.
- Cross-account media retrieval denied (404).
- Logout revokes session (subsequent protected request returns 401).
- Main app pages and shared auth controller served successfully.
- Original database snapshot remains unchanged: 33 game_results, 3 memories, 1 mood_entries.

## Important limitations
This is a local Pitch Fest / controlled pilot build, not production-ready healthcare software.
- No email verification, password reset, MFA, automated login rate limiting, account recovery or caregiver invitations/linking yet.
- Each family account owns its profiles; separate invited caregiver accounts and granular permissions are future work.
- Session cookie is configured for local HTTP development (`Secure=False`). Production must use HTTPS and Secure cookies.
- SQLite and local uploads are for a controlled demo only. Production requires private object storage, encrypted backups, monitoring, retention/deletion policies, security review and operational support.
- Upload validation checks MIME type and size but does not yet perform full file-signature validation or malware scanning.
- The adaptive engine remains rule-based, not trained ML. SMRITI is assistive and not a diagnosis, treatment or cure.
- Do not store real sensitive personal or health information in this build.

## Run locally
```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```
Open `http://127.0.0.1:8000/`, create a family account, and use the account bar to switch or add memory profiles.
