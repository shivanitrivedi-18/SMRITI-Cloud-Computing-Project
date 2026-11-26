/* SMRITI voice assistant: speak (Hindi/English) or type a command.
   Uses the browser Web Speech API; no audio leaves the browser through SMRITI servers. */
(function () {
  const ID = "demo-patient-001";
  const L = () => (window.SMRITI_LANG ? SMRITI_LANG() : "en");
  const T_ = (en, hi) => (L() === "hi" && hi ? hi : en);
  const has = (t, words) => words.some(w => t.includes(w));
  const say = (text) => (window.smritiSpeak ? smritiSpeak(text) : null);

  function reminders() { try { return JSON.parse(localStorage.getItem("smritiReminders") || "[]"); } catch (e) { return []; } }
  function fmt(t) { const [h, m] = t.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`; }

  function parseTime(t) {
    let m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i);
    if (m) { let h = +m[1] % 12; if (/p/i.test(m[3])) h += 12; return `${String(h).padStart(2, "0")}:${m[2] || "00"}`; }
    m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(?:बजे|baje|o'clock)/i);
    if (m) {
      let h = +m[1]; const evening = /शाम|रात|evening|night|dopahar|दोपहर|afternoon/i.test(t);
      if (evening && h < 12) h += 12; return `${String(h % 24).padStart(2, "0")}:${m[2] || "00"}`;
    }
    m = t.match(/\b(\d{1,2}):(\d{2})\b/); if (m) return `${String(+m[1]).padStart(2, "0")}:${m[2]}`;
    return null;
  }

  function addReminder(text, time) {
    let title = text.replace(/(remind me to|remind me|add reminder|reminder|मुझे|याद दिलाओ|याद दिलाना|रिमाइंडर)/gi, " ")
      .replace(/(at\s+)?\d{1,2}(:\d{2})?\s*(am|pm|a\.m\.|p\.m\.|बजे|baje|o'clock)?/gi, " ").replace(/\s+/g, " ").trim().split(" ").filter(w => !["शाम", "सुबह", "रात", "दोपहर", "की", "का", "के", "लिए", "evening", "morning", "night", "at", "to"].includes(w.toLowerCase())).join(" ");
    if (!title) title = T_("Reminder", "अनुस्मारक");
    title = title.charAt(0).toUpperCase() + title.slice(1);
    const list = reminders(); list.push({ id: Date.now(), time, title: title.slice(0, 80), type: "other", icon: "🔔" });
    list.sort((a, b) => a.time.localeCompare(b.time));
    localStorage.setItem("smritiReminders", JSON.stringify(list));
    return title;
  }

  const go = (url, en, hi) => { reply(T_(en, hi)); setTimeout(() => { location.href = url; }, 1200); };

  function interpret(raw) {
    const t = raw.toLowerCase().trim();
    if (!t) return;
    // add a reminder by voice: "remind me to take medicine at 5 pm"
    if (has(t, ["remind me", "add reminder", "add a reminder", "याद दिला", "रिमाइंडर जोड़"]) && !has(t, ["show", "read", "open", "दिखा", "सुना", "खोल"])) {
      const time = parseTime(t);
      if (time) {
        const title = addReminder(raw, time);
        reply(T_(`Done. I will remind you: ${title} at ${fmt(time)}.`, `ठीक है। मैं ${fmt(time)} पर याद दिलाऊँगी: ${title}।`));
        if (location.pathname.endsWith("reminders.html")) setTimeout(() => location.reload(), 1800);
        return;
      }
      reply(T_("Please also tell me the time, for example: remind me to drink water at 5 pm.", "कृपया समय भी बताइए, जैसे: शाम 5 बजे पानी पीने की याद दिलाओ।")); return;
    }
    if (has(t, ["read my reminders", "my reminders", "next reminder", "what's next", "अनुस्मारक सुना", "रिमाइंडर सुना", "मेरे रिमाइंडर"]) ) {
      const list = reminders(); const now = new Date(); const cur = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (!list.length) return reply(T_("You have no reminders.", "आपका कोई अनुस्मारक नहीं है।"));
      const upcoming = list.filter(r => r.time >= cur);
      const msg = (upcoming.length ? upcoming : list).map(r => `${fmt(r.time)} — ${r.title}`).join(". ");
      return reply(T_(`Your reminders: ${msg}.`, `आपके अनुस्मारक: ${msg}।`));
    }
    if (has(t, ["feel sad", "i am sad", "उदास"])) return mood("Sad", "I am sorry you feel sad. A memory activity may help.", "मुझे खेद है कि आप उदास हैं। यादों की गतिविधि मदद कर सकती है।");
    if (has(t, ["feel happy", "i am happy", "खुश"])) return mood("Happy", "Wonderful! I am glad you feel happy.", "बहुत बढ़िया! आप खुश हैं, मुझे अच्छा लगा।");
    if (has(t, ["feel good", "i am good", "अच्छा लग"])) return mood("Good", "Great to hear you feel good.", "सुनकर अच्छा लगा कि आप अच्छा महसूस कर रहे हैं।");
    if (has(t, ["feel okay", "i am okay", "i am fine", "ठीक हूँ", "ठीक हूं"])) return mood("Okay", "Thank you for telling me.", "बताने के लिए धन्यवाद।");
    if (has(t, ["what time", "the time", "समय क्या", "कितने बजे", "baje hain"])) { const n = new Date(); return reply(T_(`It is ${n.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}.`, `अभी ${n.toLocaleTimeString("hi-IN", { hour: "numeric", minute: "2-digit" })} बजे हैं।`)); }
    if (has(t, ["what date", "what day", "today's date", "तारीख", "कौन सा दिन", "आज क्या दिन"])) { const n = new Date(); return reply(T_(`Today is ${n.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}.`, `आज ${n.toLocaleDateString("hi-IN", { weekday: "long", day: "numeric", month: "long" })} है।`)); }
    if (has(t, ["reminder", "अनुस्मारक", "रिमाइंडर"])) return go("/reminders.html", "Opening your reminders.", "आपके अनुस्मारक खोल रही हूँ।");
    if (has(t, ["quiz", "cue", "memory game", "यादों का खेल", "यादों के संकेत"])) return go("/memory-quiz.html", "Starting the memory cues activity.", "यादों के संकेत वाली गतिविधि शुरू कर रही हूँ।");
    if (has(t, ["garden", "गार्डन"])) return go("/memory.html", "Opening Memory Garden.", "मेमोरी गार्डन खोल रही हूँ।");
    if (has(t, ["focus", "फोकस"])) return go("/focus.html", "Opening Focus and Find.", "फोकस एंड फाइंड खोल रही हूँ।");
    if (has(t, ["story", "routine", "कहानी", "दिनचर्या"])) return go("/routine.html", "Opening My Daily Story.", "मेरी रोज़ की कहानी खोल रही हूँ।");
    if (has(t, ["memories", "memory vault", "photos", "photo", "यादगार", "यादें", "फोटो"])) return go("/memory-vault.html", "Opening your memories.", "आपकी यादें खोल रही हूँ।");
    if (has(t, ["game", "activity", "activities", "play", "खेल", "गतिविधि"])) return go("/elder.html", "Opening today's activities.", "आज की गतिविधियाँ खोल रही हूँ।");
    if (has(t, ["progress", "प्रगति"])) return go("/progress.html", "Opening your progress.", "आपकी प्रगति खोल रही हूँ।");
    if (has(t, ["help", "मदद", "सहायता"])) return go("/help.html", "Opening help.", "मदद खोल रही हूँ।");
    if (has(t, ["caregiver", "family dashboard", "देखभाल"])) return go("/caregiver.html", "Opening the caregiver dashboard.", "देखभालकर्ता डैशबोर्ड खोल रही हूँ।");
    if (has(t, ["home", "होम", "main page"])) return go("/index.html", "Going home.", "होम पर जा रही हूँ।");
    reply(T_("Sorry, I did not understand. Try: open reminders, play a game, my memories, or remind me to drink water at 5 pm.", "माफ़ कीजिए, मैं समझ नहीं पाई। कहिए: अनुस्मारक खोलो, खेल खेलें, मेरी यादें, या शाम 5 बजे पानी पीने की याद दिलाओ।"));
  }

  async function mood(m, en, hi) {
    try { await fetch("/api/mood", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patient_id: ID, mood: m }) }); } catch (e) {}
    reply(T_(en, hi));
  }

  let panel, log, input;
  function reply(text) { addLine("🤖", text); say(text); }
  function addLine(who, text) { if (!log) return; const p = document.createElement("p"); p.style.cssText = "margin:6px 0"; p.textContent = `${who} ${text}`; log.appendChild(p); log.scrollTop = log.scrollHeight; }

  function listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { reply(T_("Voice input is not supported in this browser. Please type your command.", "इस ब्राउज़र में आवाज़ से इनपुट उपलब्ध नहीं है। कृपया लिखकर कहें।")); return; }
    const r = new SR(); r.lang = window.smritiSpeechLang ? smritiSpeechLang() : "en-IN"; r.interimResults = false; r.maxAlternatives = 1;
    const mic = panel.querySelector("#sv-mic"); mic.textContent = "👂 " + T_("Listening…", "सुन रही हूँ…");
    r.onresult = e => { const txt = e.results[0][0].transcript; addLine("🧑", txt); interpret(txt); };
    r.onerror = () => reply(T_("I could not hear that. Please try again or type.", "मैं सुन नहीं पाई। कृपया फिर कोशिश करें या लिखें।"));
    r.onend = () => { mic.textContent = "🎙️ " + T_("Tap and speak", "दबाएँ और बोलें"); };
    r.start();
  }

  function build() {
    const fab = document.createElement("button");
    fab.type = "button"; fab.id = "smriti-voice-fab"; fab.setAttribute("aria-label", "Voice assistant"); fab.textContent = "🎙️";
    fab.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:9998;width:60px;height:60px;border-radius:50%;border:0;font-size:28px;background:#b45309;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.3);cursor:pointer";
    panel = document.createElement("div"); panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "SMRITI voice assistant");
    panel.style.cssText = "position:fixed;right:14px;bottom:84px;z-index:9999;width:min(360px,calc(100vw - 28px));background:#fff;color:#16313a;border:1px solid #d9e6e4;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:12px;font-family:system-ui,sans-serif";
    panel.innerHTML = `<strong>${T_("SMRITI Voice Assistant", "स्मृति आवाज़ सहायक")}</strong>
      <div id="sv-log" style="max-height:170px;overflow:auto;font-size:14px;margin:6px 0"></div>
      <button id="sv-mic" type="button" style="width:100%;padding:12px;border:0;border-radius:12px;background:#0f766e;color:#fff;font-weight:700;font-size:16px;cursor:pointer">🎙️ ${T_("Tap and speak", "दबाएँ और बोलें")}</button>
      <form id="sv-form" style="display:flex;gap:6px;margin-top:8px"><input id="sv-in" autocomplete="off" placeholder="${T_("or type a command", "या कमांड लिखें")}" style="flex:1;padding:10px;border:1px solid #cbd5e1;border-radius:10px"><button type="submit" style="border:0;border-radius:10px;background:#16313a;color:#fff;padding:0 14px">➤</button></form>
      <p style="font-size:12px;color:#527079;margin:8px 0 0">${T_("Try: “open reminders”, “remind me to drink water at 5 pm”, “play a game”, “I feel sad”.", "कहें: “अनुस्मारक खोलो”, “शाम 5 बजे पानी पीने की याद दिलाओ”, “खेल खेलें”, “मैं उदास हूँ”।")}</p>`;
    document.body.append(panel, fab);
    log = panel.querySelector("#sv-log"); input = panel.querySelector("#sv-in");
    fab.onclick = () => { panel.hidden = !panel.hidden; if (!panel.hidden && !log.childElementCount) reply(T_("Hello! How can I help you?", "नमस्ते! मैं आपकी कैसे मदद करूँ?")); };
    panel.querySelector("#sv-mic").onclick = listen;
    panel.querySelector("#sv-form").onsubmit = e => { e.preventDefault(); const v = input.value; input.value = ""; addLine("🧑", v); interpret(v); };
  }
  document.addEventListener("DOMContentLoaded", () => {
    build();
    window.startVoice = () => { panel.hidden = false; if (!log.childElementCount) reply(T_("Hello! How can I help you?", "नमस्ते! मैं आपकी कैसे मदद करूँ?")); };
  });
  window.smritiVoiceInterpret = interpret; // exposed for testing
})();
