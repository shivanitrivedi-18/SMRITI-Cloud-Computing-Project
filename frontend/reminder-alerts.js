/* SMRITI reminder alerts: when a reminder's time arrives, show a large friendly card,
   speak it aloud (Hindi/English), and offer Done / Snooze 10 min. Family reminders can show a saved memory cue. */
(function () {
  const ID = "demo-patient-001";
  const L = () => (window.SMRITI_LANG ? SMRITI_LANG() : "en");
  const tx = (en, hi) => (L() === "hi" && hi ? hi : en);
  const pad = n => String(n).padStart(2, "0");
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "") ?? d; } catch (e) { return d; } };
  let showing = null, cueCache = null;

  async function getCue() {
    if (cueCache !== null) return cueCache;
    try { const r = await fetch(`/api/patient/${ID}/memory-cues`); const d = await r.json(); cueCache = (d.cues && d.cues[0]) ? d.cues[0] : false; } catch (e) { cueCache = false; }
    return cueCache;
  }

  async function show(r) {
    if (showing) return; showing = r;
    const box = document.createElement("div"); box.id = "smriti-alert"; box.setAttribute("role", "alertdialog"); box.setAttribute("aria-live", "assertive");
    box.style.cssText = "position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:10000;width:min(480px,calc(100vw - 24px));background:#fff;color:#16313a;border:3px solid #0f766e;border-radius:20px;box-shadow:0 14px 40px rgba(0,0,0,.35);padding:18px;font-family:system-ui,sans-serif;text-align:center";
    const cue = r.type === "family" ? await getCue() : null;
    const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    box.innerHTML = `<div style="font-size:44px">${esc(r.icon || "🔔")}</div>
      <div style="font-size:13px;letter-spacing:1px;color:#527079;font-weight:700">${tx("SMRITI REMINDER", "स्मृति अनुस्मारक")} · ${esc(r.time)}</div>
      <div style="font-size:26px;font-weight:800;margin:6px 0">${esc(r.title)}</div>
      ${cue ? `<div style="background:#f0f9f7;border-radius:12px;padding:8px;margin:8px 0;font-size:15px">💬 ${esc(cue.context || cue.title)}</div>` : ""}
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px">
        <button data-a="done" style="padding:12px 18px;border:0;border-radius:12px;background:#0f766e;color:#fff;font-size:17px;font-weight:700">✓ ${tx("Done", "हो गया")}</button>
        <button data-a="snooze" style="padding:12px 18px;border:0;border-radius:12px;background:#b45309;color:#fff;font-size:17px;font-weight:700">⏰ ${tx("Snooze 10 min", "10 मिनट बाद")}</button>
        <button data-a="read" style="padding:12px 18px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;font-size:17px">🔊</button></div>`;
    document.body.appendChild(box);
    const speakIt = () => window.smritiSpeak && smritiSpeak(tx(`Reminder. ${r.title}.`, `अनुस्मारक। ${r.title}।`));
    speakIt();
    box.onclick = e => {
      const a = e.target.closest("button")?.dataset.a; if (!a) return;
      if (a === "read") return speakIt();
      if (a === "snooze") { const s = jget("smritiSnoozed", []); s.push({ r, at: Date.now() + 10 * 60 * 1000 }); localStorage.setItem("smritiSnoozed", JSON.stringify(s)); }
      box.remove(); showing = null; window.speechSynthesis && speechSynthesis.cancel();
    };
  }

  function tick() {
    const now = new Date(), cur = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const fired = jget("smritiFired", {}); const day = todayKey();
    Object.keys(fired).forEach(k => { if (!k.startsWith(day)) delete fired[k]; });
    for (const r of jget("smritiReminders", [])) {
      const key = `${day}|${r.id}|${r.time}`;
      if (r.time === cur && !fired[key]) { fired[key] = 1; localStorage.setItem("smritiFired", JSON.stringify(fired)); show(r); return; }
    }
    const sn = jget("smritiSnoozed", []); const due = sn.find(s => s.at <= Date.now());
    if (due && !showing) { localStorage.setItem("smritiSnoozed", JSON.stringify(sn.filter(s => s !== due && s.at !== due.at))); show(due.r); }
  }
  document.addEventListener("DOMContentLoaded", () => { tick(); setInterval(tick, 15000); });
})();
