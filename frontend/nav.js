/* SMRITI in-app navigation: a consistent Back + Home pill on every inner page.
   Back returns to the previous SMRITI page; if there is none (page opened directly) it goes to the parent screen. */
(function () {
  const path = location.pathname.replace(/\/+$/, "") || "/index.html";
  if (path === "/index.html" || path === "" || path === "/") return;
  const PARENT = {
    "/elder.html": "/index.html", "/caregiver.html": "/index.html", "/care-centre.html": "/caregiver.html", "/business.html": "/index.html",
    "/memory.html": "/elder.html", "/focus.html": "/elder.html", "/routine.html": "/elder.html", "/memory-quiz.html": "/elder.html",
    "/reminders.html": "/elder.html", "/help.html": "/elder.html", "/progress.html": "/elder.html", "/memory-vault.html": "/elder.html"
  };
  const tx = (en, hi) => (window.T ? T(en, hi) : en);
  function back() {
    let sameSite = false;
    try { sameSite = document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1; } catch (e) {}
    if (sameSite) history.back(); else location.href = PARENT[path] || "/index.html";
  }
  document.addEventListener("DOMContentLoaded", () => {
    const bar = document.createElement("div"); bar.id = "smriti-nav";
    bar.style.cssText = "position:fixed;left:12px;bottom:14px;z-index:9997;display:flex;gap:8px;font-family:system-ui,sans-serif";
    const mk = (label, fn, aria) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = label; b.setAttribute("aria-label", aria);
      b.style.cssText = "border:0;border-radius:999px;padding:13px 18px;font-size:16px;font-weight:700;background:#16313a;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer";
      b.onclick = fn; return b;
    };
    const backBtn = mk("← " + tx("Back", "वापस"), back, "Go back");
    const homeBtn = mk("🏠", () => { location.href = "/index.html"; }, "Home");
    bar.append(backBtn, homeBtn); document.body.appendChild(bar);
    // keep the label in step with the language switch
    new MutationObserver(() => {}).observe(document.body, { childList: false });
    window.addEventListener("storage", () => {});
    const refresh = () => { backBtn.textContent = "← " + tx("Back", "वापस"); };
    const orig = window.applySmritiLanguage; if (orig) window.applySmritiLanguage = function () { orig(); refresh(); };
  });
})();
