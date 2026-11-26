/* SMRITI family-account gate. Same-origin HttpOnly session cookie; profile ID is selected per browser. */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const DEMO_ID = "demo-patient-001";
  let activeProfileId = null;
  let authReadyResolve;
  const authReady = new Promise(resolve => { authReadyResolve = resolve; });
  const protectedApi = url => String(url).startsWith("/api/") && !String(url).startsWith("/api/auth/") && !String(url).startsWith("/api/health");

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    if (protectedApi(url)) {
      await authReady;
      if (!activeProfileId) throw new Error("Please sign in to use SMRITI.");
      let nextUrl = String(url).replaceAll(DEMO_ID, encodeURIComponent(activeProfileId));
      const options = { ...init, credentials: "same-origin" };
      if (typeof options.body === "string" && (options.headers?.["Content-Type"] || options.headers?.["content-type"] || "").includes("application/json")) {
        try { const body = JSON.parse(options.body); if (body.patient_id === DEMO_ID) body.patient_id = activeProfileId; options.body = JSON.stringify(body); } catch (_) {}
      }
      return nativeFetch(nextUrl, options);
    }
    return nativeFetch(input, { ...init, credentials: "same-origin" });
  };

  function ensureStyles() {
    if (document.getElementById("smriti-auth-style")) return;
    const style = document.createElement("style"); style.id = "smriti-auth-style";
    style.textContent = `
      #smriti-account-bar{position:fixed;z-index:9000;top:10px;right:14px;display:flex;gap:8px;align-items:center;background:#fff;border:1px solid #dbe3e8;border-radius:14px;padding:8px 10px;box-shadow:0 4px 18px #17324d18;font:14px Arial,sans-serif;color:#17324d}
      #smriti-account-bar select,#smriti-account-bar button{font:inherit;border:1px solid #d2dce2;border-radius:8px;padding:7px;background:#fff;color:#17324d}
      #smriti-auth-overlay{position:fixed;inset:0;z-index:10000;background:#102b36cc;display:flex;align-items:center;justify-content:center;padding:18px;font-family:Arial,sans-serif}
      #smriti-auth-card{width:min(440px,100%);background:#fff;border-radius:22px;padding:28px;box-shadow:0 24px 70px #0004;color:#18313d}
      #smriti-auth-card h2{margin:0 0 8px;font-size:28px}#smriti-auth-card p{color:#5b6b73;line-height:1.5}
      #smriti-auth-card label{display:block;font-weight:600;margin:12px 0 5px}#smriti-auth-card input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #cbd6dc;border-radius:10px;font-size:16px}
      #smriti-auth-card button{border:0;border-radius:10px;padding:12px 16px;background:#164b59;color:#fff;font-weight:700;font-size:15px;cursor:pointer;margin-top:14px}
      #smriti-auth-card .secondary{background:#eef3f5;color:#164b59;margin-left:6px}#smriti-auth-error{color:#a12626;min-height:20px;font-size:14px}
      @media(max-width:600px){#smriti-account-bar{top:6px;right:6px;max-width:calc(100% - 12px);font-size:12px}#smriti-account-bar select{max-width:130px}}
    `; document.head.appendChild(style);
  }
  function showAuth() {
    ensureStyles(); if (document.getElementById("smriti-auth-overlay")) return;
    const overlay = document.createElement("div"); overlay.id = "smriti-auth-overlay";
    overlay.innerHTML = `<section id="smriti-auth-card"><div style="font-size:13px;letter-spacing:2px;font-weight:700;color:#397c83">SMRITI · PRIVATE FAMILY SPACE</div><h2>Welcome to SMRITI</h2><p>Create a family account or sign in to access your private memory profiles. Use fictional data in this pilot.</p><form id="smriti-auth-form"><div id="smriti-name-wrap"><label for="smriti-name">Your name</label><input id="smriti-name" minlength="2" maxlength="80" autocomplete="name" required></div><label for="smriti-email">Email</label><input id="smriti-email" type="email" maxlength="254" autocomplete="email" required><label for="smriti-password">Password</label><input id="smriti-password" type="password" minlength="10" maxlength="128" autocomplete="new-password" required><div id="smriti-auth-error" role="alert"></div><button id="smriti-auth-submit" type="submit">Create family account</button><button id="smriti-auth-toggle" class="secondary" type="button">I already have an account</button></form><p style="font-size:12px;margin-bottom:0">Pilot version: no email verification or password-reset flow yet. Do not use a password you use elsewhere.</p></section>`;
    document.body.appendChild(overlay);
    let register = true;
    const nameWrap = overlay.querySelector("#smriti-name-wrap"), password = overlay.querySelector("#smriti-password"), submit = overlay.querySelector("#smriti-auth-submit"), toggle = overlay.querySelector("#smriti-auth-toggle");
    toggle.addEventListener("click", () => { register = !register; nameWrap.hidden = !register; password.autocomplete = register ? "new-password" : "current-password"; password.minLength = register ? 10 : 1; submit.textContent = register ? "Create family account" : "Sign in"; toggle.textContent = register ? "I already have an account" : "Create a new account"; overlay.querySelector("#smriti-auth-error").textContent = ""; });
    overlay.querySelector("#smriti-auth-form").addEventListener("submit", async event => {
      event.preventDefault(); const error = overlay.querySelector("#smriti-auth-error"); submit.disabled = true; error.textContent = "Please wait…";
      const payload = { email: overlay.querySelector("#smriti-email").value.trim(), password: password.value };
      if (register) payload.display_name = overlay.querySelector("#smriti-name").value.trim();
      try {
        const response = await nativeFetch(register ? "/api/auth/register" : "/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"same-origin", body:JSON.stringify(payload) });
        const data = await response.json(); if (!response.ok) throw new Error(data.detail || "Unable to continue.");
        const profiles = data.profiles || (data.default_profile_id ? [{id:data.default_profile_id}] : []);
        if (profiles[0]) localStorage.setItem("smriti_active_profile", profiles[0].id);
        location.reload();
      } catch (err) { error.textContent = err.message; submit.disabled = false; }
    });
  }
  async function addAccountBar(data) {
    ensureStyles(); const profiles = data.profiles || [];
    const saved = localStorage.getItem("smriti_active_profile");
    activeProfileId = profiles.some(p => p.id === saved) ? saved : (data.default_profile_id || profiles[0]?.id || null);
    if (!activeProfileId) { showAuth(); return; }
    localStorage.setItem("smriti_active_profile", activeProfileId);
    const bar = document.createElement("div"); bar.id = "smriti-account-bar";
    const options = profiles.map(p => `<option value="${p.id}" ${p.id===activeProfileId?"selected":""}>${String(p.display_name).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}</option>`).join("");
    bar.innerHTML = `<span aria-label="Signed in">👤 ${String(data.user.display_name).replace(/[&<>"']/g,"")}</span><select aria-label="Choose memory profile">${options}</select><button type="button" id="smriti-add-profile">+ Profile</button><button type="button" id="smriti-signout">Sign out</button>`;
    document.body.appendChild(bar);
    bar.querySelector("select").addEventListener("change", e => { localStorage.setItem("smriti_active_profile",e.target.value); location.reload(); });
    bar.querySelector("#smriti-add-profile").addEventListener("click", async () => {
      const name=prompt("Name for this memory profile:"); if(!name || name.trim().length<2) return;
      const relationship=prompt("Relationship (for example: Self, Mother, Father, Grandparent):"); if(!relationship || relationship.trim().length<2) return;
      const response=await nativeFetch("/api/profiles",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({display_name:name.trim(),relationship:relationship.trim()})});
      const result=await response.json(); if(!response.ok){alert(result.detail||"Could not create profile.");return;} localStorage.setItem("smriti_active_profile",result.profile.id); location.reload();
    });
    bar.querySelector("#smriti-signout").addEventListener("click", async () => { await nativeFetch("/api/auth/logout",{method:"POST",credentials:"same-origin"}); localStorage.removeItem("smriti_active_profile"); location.reload(); });
  }
  document.addEventListener("DOMContentLoaded", async () => {
    try { const response=await nativeFetch("/api/auth/me",{credentials:"same-origin"}); if(!response.ok){showAuth();authReadyResolve();return;} const data=await response.json(); await addAccountBar(data); authReadyResolve(); }
    catch (_) { showAuth(); authReadyResolve(); }
  });
  window.SMRITI_AUTH_READY = authReady;
})();
