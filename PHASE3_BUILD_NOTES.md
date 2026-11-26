# SMRITI Phase 3 – Connected Memory Experience

## Implemented in this build
1. **Connected Memory Experience**
   - New additive SQLite `memory_links` table.
   - Family can connect two memories using a short relationship label.
   - Memory network API returns profile-owned memory nodes and links.
   - Connections can be removed independently; deleting a memory cascades its links.
   - Both memories are checked against the selected profile before a link is created.

2. **Context-aware supportive prompts**
   - New memory-cues endpoint returns optional prompts based only on saved memory titles and context fields.
   - Memory Vault shows up to three prompts.
   - No face/person recognition, inference, diagnosis or claim of improved cognition.

3. **Caregiver Memory Library Insights**
   - Shows saved memory count, category distribution, explicit connection count and activity-session count.
   - Clearly described as a content/activity summary, not a clinical assessment.

4. **Family contribution foundation**
   - Existing Phase 2 family-account ownership and private profile boundary is retained.
   - Authenticated members of the same family account can contribute through the existing shared profile access. Separate invited accounts, roles and granular permissions are not implemented in this phase.

5. **Adaptive Engine**
   - Existing rule-based activity recommendation remains intact and accurately labelled.
   - This phase does not add or claim a trained machine-learning model.

## Database and compatibility
- Additive migration only: creates `memory_links`; does not replace or drop existing tables.
- Existing authentication, profiles, Memory Vault fields/media, activities, mood and reminders are retained.
- All new endpoints require the existing session and verify profile ownership.

## Validation checklist
- Python syntax compilation: run `python -m compileall backend`.
- JavaScript syntax: run `node --check` for each frontend `.js` file (if Node.js is installed).
- Start with `uvicorn backend.main:app --reload`.
- Sign in, select a profile, add two memories, connect them, refresh, remove the connection, and confirm both memories remain.
- Switch profiles and confirm the previous profile's graph and insights are not shown.
- Use two separate family accounts to verify cross-account profile access remains denied.

## Pilot limitations / next work
- This remains a controlled demo, not production healthcare software.
- Family contribution is currently within a shared family account/profile; invitations and granular caregiver/member permissions are future work.
- Contextual prompts are simple deterministic templates, not AI-generated clinical guidance.
- Adaptive recommendations remain rule-based.
- Email verification, password reset, MFA, login rate limiting, production HTTPS/Secure cookies, private object storage, encrypted backups, malware scanning, retention/deletion policy and security review remain outstanding.
- Use fictional demo data only. Do not store real sensitive personal or health information in this pilot.
