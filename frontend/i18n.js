/* SMRITI Hindi + English support.
   - Language is stored in localStorage("smritiLanguage") = "en" | "hi".
   - Static page text is translated through the dictionary below (exact text match, reversible).
   - New features use window.T(english, hindi) directly.
   - Dynamic text added later is translated by a MutationObserver. */
(function () {
  const HI = {
    "Remember. Engage. Connect.": "याद करें। जुड़ें। साथ रहें।",
    "Namaste": "नमस्ते", "Welcome to SMRITI": "स्मृति में आपका स्वागत है",
    "Your gentle AI companion for memory, cognitive activities and everyday wellbeing.": "याददाश्त, मानसिक गतिविधियों और रोज़ की भलाई के लिए आपका सहज AI साथी।",
    "How would you like to continue?": "आप कैसे आगे बढ़ना चाहेंगे?",
    "Elder Mode": "बुज़ुर्ग मोड", "Simple activities, memory games and daily assistance": "सरल गतिविधियाँ, याददाश्त के खेल और रोज़ की मदद",
    "Caregiver Mode": "देखभालकर्ता मोड", "Monitor progress, reminders and AI insights": "प्रगति, अनुस्मारक और AI जानकारी देखें",
    "Talk to SMRITI": "स्मृति से बात करें", "You can speak instead of typing.": "टाइप करने की जगह आप बोल सकते हैं।",
    "SMRITI • AI Cognitive Companion": "स्मृति • AI संज्ञानात्मक साथी", "🔒 Privacy First": "🔒 पहले गोपनीयता",
    "Business model (Pitch Fest)": "बिज़नेस मॉडल (पिच फेस्ट)",
    "SMRITI — My Day": "स्मृति — मेरा दिन", "Your cognitive companion": "आपका मानसिक साथी", "My Profile": "मेरी प्रोफ़ाइल",
    "Today": "आज", "Good morning,": "शुभ प्रभात,", "Let's make today a wonderful day for your mind.": "आज का दिन आपके मन के लिए शानदार बनाएँ।",
    "day": "दिन", "activity streak": "गतिविधि की लगातार कड़ी", "Today's activities": "आज की गतिविधियाँ",
    "A gentle plan designed especially for you": "आपके लिए खास बनाई गई सहज योजना", "AI Recommended": "AI सुझाव",
    "Memory Garden": "मेमोरी गार्डन", "Remember familiar objects and strengthen recall.": "जानी-पहचानी चीज़ें याद करें और याददाश्त मज़बूत करें।",
    "⏱ 5 min": "⏱ 5 मिनट", "⏱ 4 min": "⏱ 4 मिनट", "Easy": "आसान", "Next": "अगला", "Later": "बाद में",
    "Focus & Find": "फोकस एंड फाइंड", "A simple activity to exercise attention and focus.": "ध्यान और एकाग्रता के लिए एक सरल गतिविधि।",
    "My Daily Story": "मेरी रोज़ की कहानी", "Arrange familiar daily activities in the right order.": "रोज़ के जाने-पहचाने काम सही क्रम में लगाएँ।",
    "SMRITI AI": "स्मृति AI", "A little suggestion for you": "आपके लिए एक छोटा सुझाव", "SMRITI is analyzing your recent activity...": "स्मृति आपकी हाल की गतिविधि देख रही है...",
    "Start recommended activity →": "सुझाई गई गतिविधि शुरू करें →", "PERSONAL MEMORY SPACE": "निजी यादों की जगह",
    "Memory Moments": "यादगार पल", "People, places, stories and experiences that matter to you.": "आपके लिए मायने रखने वाले लोग, जगहें, कहानियाँ और अनुभव।",
    "Open Memory Moments →": "यादगार पल खोलें →", "How are you feeling?": "आप कैसा महसूस कर रहे हैं?", "Your feelings matter to SMRITI.": "आपकी भावनाएँ स्मृति के लिए मायने रखती हैं।",
    "Happy": "खुश", "Good": "अच्छा", "Okay": "ठीक", "Sad": "उदास", "Today's reminders": "आज के अनुस्मारक", "Things you don't want to forget.": "वो बातें जो आप भूलना नहीं चाहते।",
    "Cognitive activity": "मानसिक गतिविधि", "Family time": "परिवार के साथ समय", "Call your daughter": "अपनी बेटी को फ़ोन करें", "Evening activity": "शाम की गतिविधि", "Relax & reflect": "आराम करें और सोचें",
    "Home": "होम", "My Progress": "मेरी प्रगति", "Reminders": "अनुस्मारक", "Help": "मदद",
    "SMRITI — Reminders": "स्मृति — अनुस्मारक", "← Back": "← वापस", "SMRITI CARE": "स्मृति देखभाल", "Today's Reminders": "आज के अनुस्मारक",
    "Gentle reminders to help you stay comfortable and organized.": "आराम और व्यवस्था में रहने के लिए सहज अनुस्मारक।", "Your day": "आपका दिन",
    "+ Add reminder": "+ अनुस्मारक जोड़ें", "Add a reminder": "अनुस्मारक जोड़ें", "Create a gentle reminder for your day.": "अपने दिन के लिए एक सहज अनुस्मारक बनाएँ।",
    "Time": "समय", "What should SMRITI remind you about?": "स्मृति आपको किस बारे में याद दिलाए?", "Reminder type": "अनुस्मारक का प्रकार",
    "❤️ Health & Wellness": "❤️ स्वास्थ्य और सेहत", "🧠 Cognitive Activity": "🧠 मानसिक गतिविधि", "📞 Family & Friends": "📞 परिवार और मित्र", "🌸 Daily Routine": "🌸 रोज़ की दिनचर्या", "🔔 Other": "🔔 अन्य",
    "Save Reminder": "अनुस्मारक सहेजें", "Cancel": "रद्द करें", "No reminders yet": "अभी कोई अनुस्मारक नहीं",
    "Add a reminder whenever you want SMRITI to remember something for you.": "जब भी चाहें, कुछ याद दिलाने के लिए अनुस्मारक जोड़ें।",
    "SMRITI — Memory Moments": "स्मृति — यादगार पल", "Personal Memory Moments": "निजी यादगार पल", "Memories that matter.": "वो यादें जो मायने रखती हैं।",
    "Keep meaningful people, places, events and stories connected in one gentle, easy-to-use space.": "अर्थपूर्ण लोगों, जगहों, घटनाओं और कहानियों को एक सरल जगह में जोड़कर रखें।",
    "＋ Add a Memory": "＋ याद जोड़ें", "↻ Refresh": "↻ ताज़ा करें", "People": "लोग", "Places": "जगहें", "Events": "घटनाएँ", "Stories": "कहानियाँ",
    "CONNECTED MEMORIES": "जुड़ी हुई यादें", "Your family memory connections": "आपके परिवार की यादों के संबंध",
    "Connect two saved memories to show how people, places, events and stories belong together.": "दो सहेजी यादों को जोड़ें, ताकि दिखे कि लोग, जगहें, घटनाएँ और कहानियाँ कैसे साथ जुड़ी हैं।",
    "First memory": "पहली याद", "Choose a memory": "एक याद चुनें", "Second memory": "दूसरी याद", "How are they connected?": "ये कैसे जुड़ी हैं?",
    "＋ Connect memories": "＋ यादें जोड़ें", "Loading connections…": "संबंध लोड हो रहे हैं…", "GENTLE MEMORY PROMPTS": "सहज याद संकेत",
    "A memory to revisit": "फिर से याद करने के लिए एक याद", "Optional prompts from memories your family has chosen to save.": "आपके परिवार की सहेजी यादों से वैकल्पिक संकेत।",
    "Loading saved prompts…": "सहेजे संकेत लोड हो रहे हैं…", "MEMORY COLLECTION": "यादों का संग्रह", "Your Memory Moments": "आपके यादगार पल", "0 memories": "0 यादें",
    "Search memories": "यादें खोजें", "Category": "श्रेणी", "All memories": "सभी यादें", "Experiences": "अनुभव", "Search": "खोजें", "Loading your memories…": "आपकी यादें लोड हो रही हैं…",
    "SMRITI is an assistive memory-support tool and is not a medical diagnostic system.": "स्मृति एक सहायक याददाश्त-समर्थन उपकरण है, चिकित्सीय निदान प्रणाली नहीं।",
    "ADD PERSONAL CONTEXT": "निजी संदर्भ जोड़ें", "Create a Memory Moment": "एक यादगार पल बनाएँ", "Add only information you are comfortable storing.": "केवल वही जानकारी जोड़ें जिसे सहेजने में आप सहज हों।",
    "Memory title *": "याद का शीर्षक *", "Category *": "श्रेणी *", "Person": "व्यक्ति", "Place": "जगह", "Event": "घटना", "Experience": "अनुभव", "Story": "कहानी",
    "Importance": "महत्व", "Very important": "बहुत महत्वपूर्ण", "Important": "महत्वपूर्ण", "Meaningful": "अर्थपूर्ण", "Low": "कम", "Optional": "वैकल्पिक",
    "Relationship": "रिश्ता", "Year": "वर्ष", "Memory cue": "याद का संकेत", "Story / context": "कहानी / संदर्भ", "Related people": "संबंधित लोग", "Tags": "टैग",
    "Photograph (JPG, PNG or WebP; max 5 MB)": "फ़ोटो (JPG, PNG या WebP; अधिकतम 5 MB)", "Audio memory (MP3, WAV, OGG, WebM or M4A; max 12 MB)": "ऑडियो याद (MP3, WAV, OGG, WebM या M4A; अधिकतम 12 MB)", "Save Memory": "याद सहेजें",
    "SMRITI — Help": "स्मृति — मदद", "SMRITI ASSISTANT": "स्मृति सहायक", "How can I help you?": "मैं आपकी कैसे मदद कर सकती हूँ?", "Choose something below and SMRITI will guide you.": "नीचे से कुछ चुनें, स्मृति आपका मार्गदर्शन करेगी।",
    "Quick help": "त्वरित मदद", "Simple answers for your everyday needs.": "रोज़ की ज़रूरतों के लिए सरल उत्तर।", "What should I do today?": "आज मुझे क्या करना चाहिए?", "See your activities for today.": "आज की अपनी गतिविधियाँ देखें।",
    "How do I play an activity?": "गतिविधि कैसे खेलूँ?", "Learn how the cognitive activities work.": "जानें कि मानसिक गतिविधियाँ कैसे काम करती हैं।", "Show my reminders": "मेरे अनुस्मारक दिखाएँ", "Open your reminders for today.": "आज के अनुस्मारक खोलें।",
    "Show my progress": "मेरी प्रगति दिखाएँ", "See how your activities are going.": "देखें आपकी गतिविधियाँ कैसी चल रही हैं।", "SMRITI SAYS": "स्मृति कहती है", "Hello!": "नमस्ते!", "How can I help you today?": "आज मैं आपकी कैसे मदद करूँ?", "Continue": "आगे बढ़ें",
    "Need more help?": "और मदद चाहिए?", "You can always ask a family member or caregiver for help.": "आप हमेशा परिवार के किसी सदस्य या देखभालकर्ता से मदद माँग सकते हैं।", "🎙️ Hear this message": "🎙️ यह संदेश सुनें", "🏠 Back to My Day": "🏠 मेरे दिन पर वापस",
    "SMRITI — Memory Garden": "स्मृति — मेमोरी गार्डन", "✨ Personalized by SMRITI AI": "✨ स्मृति AI द्वारा आपके लिए",
    "Look carefully at the objects. Remember where they are. Then find their matching pairs.": "चीज़ों को ध्यान से देखें। याद रखें वे कहाँ हैं। फिर उनके जोड़े खोजें।",
    "cards": "कार्ड", "pairs": "जोड़े", "~3 min": "~3 मिनट", "activity": "गतिविधि", "Start Memory Garden →": "मेमोरी गार्डन शुरू करें →", "Find the matching pairs": "मिलते-जुलते जोड़े खोजें", "Moves": "चालें",
    "Remember the cards...": "कार्ड याद रखें...", "💡 Take your time. There is no need to hurry.": "💡 आराम से करें। जल्दी की कोई ज़रूरत नहीं।", "Activity completed": "गतिविधि पूरी हुई", "Wonderful work!": "बहुत बढ़िया!",
    "You completed today's Memory Garden activity.": "आपने आज की मेमोरी गार्डन गतिविधि पूरी की।", "Memory Score": "याददाश्त स्कोर", "Accuracy": "सटीकता", "Great work!": "शाबाश!", "SMRITI will personalize your next activity.": "स्मृति आपकी अगली गतिविधि आपके अनुसार बनाएगी।", "Continue to My Day →": "मेरे दिन पर जाएँ →",
    "SMRITI — Focus & Find": "स्मृति — फोकस एंड फाइंड", "Exercise your attention": "अपने ध्यान का अभ्यास करें", "Look carefully and find the special object among the others.": "ध्यान से देखें और बाकी में से खास चीज़ खोजें।",
    "Look carefully": "ध्यान से देखें", "Tap the different object": "अलग चीज़ को छुएँ", "Take your time": "आराम से करें", "Start Activity →": "गतिविधि शुरू करें →", "Round": "राउंड", "Score": "स्कोर",
    "Find the object that is different.": "जो चीज़ अलग है उसे खोजें।", "Take your time. 🌸": "आराम से करें। 🌸", "You completed your Focus & Find activity.": "आपने फोकस एंड फाइंड गतिविधि पूरी की।",
    "✨ SMRITI AI": "✨ स्मृति AI", "SMRITI is preparing your feedback...": "स्मृति आपका फ़ीडबैक तैयार कर रही है...", "Your next activity will be personalized.": "आपकी अगली गतिविधि आपके अनुसार होगी।", "Play Again": "फिर खेलें", "Back to Home": "होम पर वापस",
    "SMRITI — My Daily Story": "स्मृति — मेरी रोज़ की कहानी", "Put these familiar daily activities in the order you usually do them.": "इन जाने-पहचाने कामों को उसी क्रम में लगाएँ जिसमें आप उन्हें करते हैं।",
    "Arrange your morning": "अपनी सुबह का क्रम लगाएँ", "Choose the activity that comes first.": "जो काम पहले आता है उसे चुनें।", "💡 Think about what you normally do.": "💡 सोचें कि आप आमतौर पर क्या करते हैं।",
    "You completed your daily routine activity.": "आपने अपनी दिनचर्या की गतिविधि पूरी की।", "Analyzing your performance...": "आपका प्रदर्शन देखा जा रहा है...",
    "SMRITI — My Progress": "स्मृति — मेरी प्रगति", "See how your cognitive activities are progressing over time.": "देखें कि समय के साथ आपकी मानसिक गतिविधियाँ कैसी चल रही हैं।",
    "Activities completed": "पूरी हुई गतिविधियाँ", "Average score": "औसत स्कोर", "Average accuracy": "औसत सटीकता", "Best score": "सर्वश्रेष्ठ स्कोर", "SMRITI AI INSIGHT": "स्मृति AI जानकारी", "Analyzing your progress...": "आपकी प्रगति देखी जा रही है...",
    "Keep completing activities and SMRITI will learn your pattern.": "गतिविधियाँ करते रहें, स्मृति आपका तरीका सीख लेगी।", "Recent activities": "हाल की गतिविधियाँ"
  };
  const clean = (s) => s.replace(/\s+/g, " ").trim();
  const lang = () => (localStorage.getItem("smritiLanguage") === "hi" ? "hi" : "en");
  window.SMRITI_LANG = lang;
  window.T = (en, hi) => (lang() === "hi" && hi ? hi : en);
  window.smritiSpeechLang = () => (lang() === "hi" ? "hi-IN" : "en-IN");
  window.smritiSpeak = function (text) {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = smritiSpeechLang(); u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  // Make existing read-aloud buttons use a Hindi voice when the text is Devanagari.
  if ("speechSynthesis" in window) {
    const _speak = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = u => { try { if (/[\u0900-\u097F]/.test(u.text)) u.lang = "hi-IN"; } catch (e) {} return _speak(u); };
  }

  const orig = new WeakMap(); let busy = false;
  function translateNode(n, l) {
    let rec = orig.get(n);
    if (!rec || (n.nodeValue !== rec.o && n.nodeValue !== rec.a)) { rec = { o: n.nodeValue, a: n.nodeValue }; orig.set(n, rec); }
    const key = clean(rec.o);
    const t = l === "hi" ? HI[key] : null;
    const want = t ? rec.o.replace(key, t) : rec.o;
    rec.a = want;
    if (n.nodeValue !== want) n.nodeValue = want;
  }
  function attrs(el, l) {
    ["placeholder", "aria-label", "title"].forEach(a => {
      if (!el.hasAttribute || !el.hasAttribute(a)) return;
      const k = "data-orig-" + a; if (!el.hasAttribute(k)) el.setAttribute(k, el.getAttribute(a));
      const o = el.getAttribute(k), t = l === "hi" ? HI[clean(o)] : null;
      el.setAttribute(a, t || o);
    });
  }
  function apply(root) {
    const l = lang(); busy = true;
    document.documentElement.lang = l === "hi" ? "hi" : "en";
    const w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: n => /SCRIPT|STYLE|TEXTAREA/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let n; while ((n = w.nextNode())) translateNode(n, l);
    (root || document.body).querySelectorAll("[placeholder],[aria-label],[title]").forEach(e => attrs(e, l));
    busy = false;
  }
  window.applySmritiLanguage = () => { apply(); const b = document.getElementById("smriti-lang-fab"); if (b) b.textContent = lang() === "hi" ? "EN" : "हिं"; };

  document.addEventListener("DOMContentLoaded", () => {
    const fab = document.createElement("button");
    fab.id = "smriti-lang-fab"; fab.type = "button"; fab.setAttribute("aria-label", "Change language / भाषा बदलें");
    fab.style.cssText = "position:fixed;right:84px;bottom:14px;z-index:9998;border:0;border-radius:999px;padding:12px 16px;font-weight:800;background:#0f766e;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer";
    fab.onclick = () => { localStorage.setItem("smritiLanguage", lang() === "hi" ? "en" : "hi"); applySmritiLanguage(); };
    document.body.appendChild(fab);
    applySmritiLanguage();
    new MutationObserver(m => { if (busy) return; clearTimeout(window.__smritiI18n); window.__smritiI18n = setTimeout(() => apply(), 60); })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
