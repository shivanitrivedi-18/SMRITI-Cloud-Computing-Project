/* SMRITI Memory Cues: a gentle, no-fail activity generated from memories the family saved.
   Not a diagnostic test. Result is saved as game_type "memory_cues" so adaptive insights can use it. */
(function () {
  const ID = "demo-patient-001";
  const tx = (en, hi) => (window.T ? T(en, hi) : en);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const FALLBACK = { person_name: ["Ramesh", "Sunita", "Kavita", "Arun", "Meena"], place: ["Lucknow", "Jaipur", "Varanasi", "Mumbai", "Shimla"], event_name: ["Diwali", "Birthday", "Holi", "Family trip", "Wedding"] };
  let qs = [], i = 0, correct = 0, hints = 0, times = [], t0 = 0, current = null;

  function build(memories) {
    const out = [];
    for (const m of shuffle(memories)) {
      for (const [field, en, hi] of [["person_name", "Who is part of this memory?", "इस याद में कौन है?"], ["place", "Where did this happen?", "यह कहाँ हुआ था?"], ["event_name", "Which event is this?", "यह कौन सा अवसर है?"]]) {
        if (!m[field] || out.some(q => q.m.id === m.id)) continue;
        const pool = memories.map(x => x[field]).filter(v => v && v !== m[field]);
        const extra = FALLBACK[field].filter(v => v !== m[field] && !pool.includes(v));
        const wrong = shuffle([...new Set(pool)]).concat(shuffle(extra)).slice(0, 2);
        out.push({ m, field, q: tx(en, hi), answer: m[field], options: shuffle([m[field], ...wrong]) });
      }
      if (out.length >= 5) break;
    }
    return out;
  }

  function render() {
    const stage = document.getElementById("stage"); current = qs[i]; t0 = Date.now();
    document.getElementById("prog").style.width = `${(i / qs.length) * 100}%`;
    const m = current.m;
    const clue = [m.title, m.memory_year, m.story && String(m.story).slice(0, 140)].filter(Boolean).join(" · ");
    stage.innerHTML = `${m.photo_path ? `<img class="photo" src="${esc(m.photo_path)}" alt="">` : ""}
      <h1>${esc(current.q)}</h1><div class="clue">${esc(clue)}</div>
      ${current.options.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join("")}
      <button class="hint" id="hintBtn">💡 ${tx("Give me a hint", "संकेत दीजिए")}</button><div class="msg" id="msg"></div>`;
    stage.querySelectorAll(".opt").forEach(b => b.onclick = () => choose(b));
    document.getElementById("hintBtn").onclick = () => {
      hints++; const h = [m.relationship, m.cue, m.event_name && current.field !== "event_name" ? m.event_name : null].filter(Boolean).join(" · ");
      document.getElementById("msg").textContent = "💡 " + (h || tx("Take your time. Look at the picture or the story.", "आराम से देखें। तस्वीर या कहानी देखें।"));
    };
    if (window.applySmritiLanguage) applySmritiLanguage();
  }

  function choose(btn) {
    const picked = current.options[+btn.dataset.k]; const ok = picked === current.answer;
    times.push((Date.now() - t0) / 1000); if (ok) correct++;
    document.querySelectorAll(".opt").forEach(b => { b.disabled = true; if (current.options[+b.dataset.k] === current.answer) b.classList.add("show"); });
    const m = current.m;
    document.getElementById("msg").innerHTML = (ok ? `🌸 ${tx("Lovely! That's right.", "बहुत सुंदर! यही सही है।")}` : `🙂 ${tx("That's okay. It was", "कोई बात नहीं। यह था:")} <b>${esc(current.answer)}</b>.`)
      + (m.story ? `<div style="font-size:16px;margin-top:6px;color:#527079">${esc(String(m.story).slice(0, 200))}</div>` : "")
      + `<div><button class="next" id="nextBtn">${i + 1 < qs.length ? tx("Next →", "आगे →") : tx("Finish", "पूरा करें")}</button></div>`;
    document.getElementById("nextBtn").onclick = () => { i++; i < qs.length ? render() : finish(); };
    document.getElementById("hintBtn").remove();
  }

  async function finish() {
    document.getElementById("prog").style.width = "100%";
    const accuracy = Math.round(correct / qs.length * 100); const avg = times.reduce((a, b) => a + b, 0) / Math.max(1, times.length);
    try {
      await fetch("/api/game-results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        patient_id: ID, game_type: "memory_cues", difficulty: "easy", score: accuracy, accuracy, response_time: Math.round(avg * 10) / 10, moves: qs.length, hints }) });
    } catch (e) {}
    document.getElementById("stage").innerHTML = `<h1>🌸 ${tx("Wonderful!", "बहुत बढ़िया!")}</h1><p class="clue">${tx(`You revisited ${qs.length} family memories today.`, `आज आपने परिवार की ${qs.length} यादें फिर से देखीं।`)}</p>
      <button class="next" onclick="location.href='/elder.html'">${tx("Back to My Day", "मेरे दिन पर वापस")}</button>`;
    if (window.smritiSpeak) smritiSpeak(tx("Wonderful! You revisited your family memories.", "बहुत बढ़िया! आपने अपने परिवार की यादें फिर से देखीं।"));
    if (window.applySmritiLanguage) applySmritiLanguage();
  }

  window.speakQ = () => { if (current && window.smritiSpeak) smritiSpeak(current.q + " " + current.options.join(", ")); };

  async function init() {
    const stage = document.getElementById("stage");
    try {
      const r = await fetch(`/api/patient/${ID}/memories`); const d = await r.json();
      if (!r.ok) throw new Error();
      qs = build(d.memories || []);
    } catch (e) { stage.textContent = tx("Memories could not be loaded. Please sign in and try again.", "यादें लोड नहीं हो सकीं। कृपया साइन इन करके फिर कोशिश करें।"); return; }
    if (!qs.length) { stage.innerHTML = `<h1>${tx("No memories to play with yet", "अभी खेलने के लिए यादें नहीं हैं")}</h1><p>${tx("Ask a family member to add a person, place or event in the Memory Vault.", "परिवार के किसी सदस्य से मेमोरी वॉल्ट में कोई व्यक्ति, जगह या अवसर जोड़ने को कहें।")}</p><button class="next" onclick="location.href='/memory-vault.html'">${tx("Open Memory Vault", "मेमोरी वॉल्ट खोलें")}</button>`; if (window.applySmritiLanguage) applySmritiLanguage(); return; }
    render();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
