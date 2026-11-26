/* SMRITI Phase 4: statistical trend forecast + reminiscence starters (non-diagnostic). */
(function () {
  const ID = "demo-patient-001"; // auth.js maps this to the signed-in profile
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const COLORS = { attention: "#b45309", improving: "#15803d", steady: "#0f766e", insufficient_data: "#64748b" };

  function chart(series, forecast) {
    const W = 640, H = 200, P = 28, n = series.length + forecast.length;
    const x = i => P + (W - 2 * P) * i / Math.max(1, n - 1);
    const y = v => H - P - (H - 2 * P) * v / 100;
    const line = series.map((s, i) => `${x(i)},${y(s.smoothed)}`).join(" ");
    const dots = series.map((s, i) => `<circle cx="${x(i)}" cy="${y(s.score)}" r="2.5" fill="#94a3b8"/>`).join("");
    const last = series.length - 1;
    const fc = [`${x(last)},${y(series[last].smoothed)}`].concat(forecast.map((v, k) => `${x(last + k + 1)},${y(v)}`)).join(" ");
    const grid = [0, 25, 50, 75, 100].map(v => `<line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" stroke="#e2e8f0"/><text x="2" y="${y(v) + 4}" font-size="10" fill="#64748b">${v}</text>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Activity score trend with projection" style="width:100%;height:auto">${grid}${dots}<polyline points="${line}" fill="none" stroke="#0f766e" stroke-width="3"/><polyline points="${fc}" fill="none" stroke="#b45309" stroke-width="3" stroke-dasharray="6 5"/></svg>
      <p style="font-size:12px;margin:4px 0 0;color:#475569">Solid line: smoothed score · Dots: each session · Dashed: projected next 3 sessions</p>`;
  }

  async function load() {
    const box = $("forecastBody"); if (!box) return;
    try {
      const r = await fetch(`/api/patient/${ID}/forecast`); const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "unavailable");
      const color = COLORS[d.status] || "#64748b";
      let html = `<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center"><span style="background:${color};color:#fff;padding:6px 14px;border-radius:999px;font-weight:700">${esc(d.label)}</span><span>${esc(d.message)}</span></div>`;
      if (d.series && d.series.length) {
        html += `<div class="metrics" style="margin-top:12px"><div class="metric-card"><div><span>Baseline</span><strong>${d.baseline}</strong></div></div><div class="metric-card"><div><span>Recent</span><strong>${d.recent}</strong></div></div><div class="metric-card"><div><span>Change</span><strong>${d.change > 0 ? "+" : ""}${d.change}</strong></div></div><div class="metric-card"><div><span>Confidence</span><strong>${d.confidence}%</strong></div></div></div>`;
        html += chart(d.series, d.forecast);
        if (d.suggestion) html += `<p><strong>Suggestion:</strong> ${esc(d.suggestion)}</p>`;
        html += `<p style="font-size:12px;color:#475569">Method: ${esc(d.method)}</p>`;
      } else {
        html += `<p><button type="button" id="seedDemoBtn" class="btn">Load fictional demo data (for demonstration)</button></p>`;
      }
      html += `<p class="disclaimer">${esc(d.disclaimer)}</p>`;
      box.innerHTML = html;
      const b = $("seedDemoBtn");
      if (b) b.onclick = async () => { b.disabled = true; const s = await fetch(`/api/patient/${ID}/demo-seed`, { method: "POST" }); if (s.ok) location.reload(); else { b.disabled = false; b.textContent = "Demo data unavailable for this profile"; } };
    } catch (e) { box.textContent = "Trend forecast could not be loaded right now."; }

    const wk = $("weeklyBody");
    if (wk) try {
      const r = await fetch(`/api/patient/${ID}/weekly-summary`); const d = await r.json();
      const hi = window.SMRITI_LANG && SMRITI_LANG() === "hi";
      wk.innerHTML = `<ul style="font-size:17px;line-height:1.7">${(hi ? d.summary_hi : d.summary_en).map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="disclaimer">${esc(d.note)}</p>`;
    } catch (e) { wk.textContent = "Weekly summary unavailable right now."; }

    const rem = $("reminiscenceBody");
    if (rem) try {
      const r = await fetch(`/api/patient/${ID}/reminiscence`); const d = await r.json();
      rem.innerHTML = d.prompts && d.prompts.length
        ? d.prompts.map(p => `<div style="margin:8px 0;padding:10px;border:1px solid #e2e8f0;border-radius:10px"><strong>${esc(p.title)}</strong><ul style="margin:6px 0 0 18px">${p.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ul></div>`).join("")
        : "<p>Add memories in the Memory Vault to get conversation starters.</p>";
    } catch (e) { rem.textContent = "Conversation starters unavailable right now."; }
  }
  document.addEventListener("DOMContentLoaded", load);
})();
