const PATIENT_ID = "demo-patient-001"; // Demo profile only; replace after secure account onboarding exists.
let currentMemories = [];

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
}

function mediaMarkup(memory) {
    let html = "";
    if (memory.photo_path) {
        const photoUrl = memory.photo_path.startsWith("/uploads/") ? memory.photo_path.replace("/uploads/", "/api/media/") : memory.photo_path;
        html += `<img class="memory-photo" src="${escapeHtml(photoUrl)}" alt="Photo for ${escapeHtml(memory.title)}" loading="lazy">`;
    }
    if (memory.audio_path) {
        const audioUrl = memory.audio_path.startsWith("/uploads/") ? memory.audio_path.replace("/uploads/", "/api/media/") : memory.audio_path;
        html += `<audio class="memory-audio" controls preload="none" aria-label="Audio memory for ${escapeHtml(memory.title)}"><source src="${escapeHtml(audioUrl)}"></audio>`;
    }
    return html;
}

function renderMemories(memories) {
    const grid = document.getElementById("memoryGrid");
    document.getElementById("memoryCount").textContent = `${memories.length} memor${memories.length === 1 ? "y" : "ies"}`;
    if (!memories.length) {
        grid.innerHTML = '<div class="empty">No memories match this view. Add a meaningful moment or clear your filters.</div>';
        return;
    }
    grid.innerHTML = memories.map(memory => `
        <article class="memory-card">
            ${mediaMarkup(memory)}
            <div class="top"><span class="tag">${escapeHtml(memory.category)}</span><span aria-label="Importance ${escapeHtml(memory.importance)} out of 5">★ ${escapeHtml(memory.importance)}/5</span></div>
            <h3>${escapeHtml(memory.title)}</h3>
            ${memory.person_name ? `<p class="memory-meta">👤 ${escapeHtml(memory.person_name)}${memory.relationship ? ` · ${escapeHtml(memory.relationship)}` : ""}</p>` : ""}
            ${memory.place ? `<p class="memory-meta">📍 ${escapeHtml(memory.place)}</p>` : ""}
            ${memory.event_name ? `<p class="memory-meta">🎉 ${escapeHtml(memory.event_name)}${memory.memory_year ? ` · ${escapeHtml(memory.memory_year)}` : ""}</p>` : ""}
            ${memory.related_people ? `<p class="memory-meta">🤝 Connected with: ${escapeHtml(memory.related_people)}</p>` : ""}
            ${memory.story ? `<p>${escapeHtml(memory.story)}</p>` : ""}
            ${memory.tags ? `<p class="memory-meta">Tags: ${escapeHtml(memory.tags)}</p>` : ""}
            ${memory.cue ? `<span class="cue">Memory cue: ${escapeHtml(memory.cue)}</span>` : ""}
            <div class="card-actions"><button class="edit" type="button" onclick="editMemory(${memory.id})">Edit memory</button><button class="delete" type="button" onclick="removeMemory(${memory.id})">Remove</button></div>
        </article>
    `).join("");
}

async function loadMemories() {
    const grid = document.getElementById("memoryGrid");
    grid.innerHTML = '<div class="loading">Loading your memories…</div>';
    const search = document.getElementById("memorySearch").value.trim();
    const category = document.getElementById("categoryFilter").value;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category !== "all") params.set("category", category);
    try {
        const response = await fetch(`/api/patient/${PATIENT_ID}/memories?${params.toString()}`);
        if (!response.ok) throw new Error("Unable to load memories");
        const data = await response.json();
        currentMemories = data.memories || [];
        renderMemories(currentMemories);
    } catch (error) {
        console.error(error);
        grid.innerHTML = '<div class="empty">We could not load memories right now. Please try again.</div>';
    }
}

function openAddMemory() {
    document.getElementById("modalTitle").textContent = "Create a Memory Moment";
    document.getElementById("memoryId").value = "";
    document.getElementById("memoryModal").classList.remove("hidden");
    document.getElementById("title").focus();
}
function closeAddMemory() {
    document.getElementById("memoryModal").classList.add("hidden");
    document.getElementById("memoryForm").reset();
    document.getElementById("memoryId").value = "";
    document.getElementById("formMessage").textContent = "";
}

function editMemory(id) {
    const memory = currentMemories.find(item => item.id === id);
    if (!memory) return;
    document.getElementById("modalTitle").textContent = "Edit Memory Moment";
    document.getElementById("memoryId").value = memory.id;
    const fields = ["title", "category", "personName", "relationship", "place", "eventName", "memoryYear", "story", "cue", "importance", "tags", "relatedPeople"];
    const keys = ["title", "category", "person_name", "relationship", "place", "event_name", "memory_year", "story", "cue", "importance", "tags", "related_people"];
    fields.forEach((field, index) => {
        const element = document.getElementById(field);
        if (element) element.value = memory[keys[index]] ?? (field === "importance" ? "3" : "");
    });
    document.getElementById("photoFile").value = "";
    document.getElementById("audioFile").value = "";
    document.getElementById("memoryModal").classList.remove("hidden");
}

async function uploadSelectedMedia(memoryId, fieldId, kind) {
    const input = document.getElementById(fieldId);
    const file = input.files && input.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`/api/patient/${PATIENT_ID}/memories/${memoryId}/media?kind=${kind}`, { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `Unable to upload ${kind}`);
}

async function saveMemory(event) {
    event.preventDefault();
    const existingId = document.getElementById("memoryId").value;
    const payload = {
        patient_id: PATIENT_ID,
        title: document.getElementById("title").value.trim(),
        category: document.getElementById("category").value,
        person_name: document.getElementById("personName").value.trim() || null,
        relationship: document.getElementById("relationship").value.trim() || null,
        place: document.getElementById("place").value.trim() || null,
        event_name: document.getElementById("eventName").value.trim() || null,
        memory_year: document.getElementById("memoryYear").value ? Number(document.getElementById("memoryYear").value) : null,
        story: document.getElementById("story").value.trim() || null,
        cue: document.getElementById("cue").value.trim() || null,
        importance: Number(document.getElementById("importance").value),
        tags: document.getElementById("tags").value.trim() || null,
        related_people: document.getElementById("relatedPeople").value.trim() || null
    };
    const message = document.getElementById("formMessage");
    const submit = document.getElementById("saveMemoryButton");
    submit.disabled = true;
    message.textContent = "Saving memory…";
    try {
        const response = await fetch(existingId ? `/api/patient/${PATIENT_ID}/memories/${existingId}` : "/api/memories", {
            method: existingId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Unable to save memory");
        const memoryId = existingId ? Number(existingId) : data.memory_id;
        await uploadSelectedMedia(memoryId, "photoFile", "photo");
        await uploadSelectedMedia(memoryId, "audioFile", "audio");
        closeAddMemory();
        await loadMemories();
    } catch (error) {
        message.textContent = error.message;
    } finally {
        submit.disabled = false;
    }
}

async function removeMemory(id) {
    if (!confirm("Remove this memory from SMRITI?")) return;
    try {
        const response = await fetch(`/api/patient/${PATIENT_ID}/memories/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Unable to remove memory");
        await loadMemories();
    } catch (error) { alert(error.message); }
}

function speakMemories() {
    if (!("speechSynthesis" in window)) { alert("Voice support is not available in this browser."); return; }
    const cards = [...document.querySelectorAll(".memory-card h3")].map(x => x.textContent).slice(0, 5);
    const text = cards.length ? `Here are some of your memory moments: ${cards.join(", ")}.` : "There are no saved memory moments yet.";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}
function goBack() { history.back(); }

document.addEventListener("DOMContentLoaded", () => {
    loadMemories();
    loadMemoryNetwork();
    loadContextualMemoryCues();
    document.getElementById("memorySearch").addEventListener("keydown", event => {
        if (event.key === "Enter") loadMemories();
    });
    document.getElementById("categoryFilter").addEventListener("change", loadMemories);
});
document.addEventListener("keydown", event => { if (event.key === "Escape") closeAddMemory(); });


/* Phase 3: connected memory graph and caregiver-approved contextual prompts. */
let memoryNetworkCache = { memories: [], links: [] };

async function loadMemoryNetwork() {
    const list = document.getElementById("networkList");
    if (!list) return;
    try {
        const response = await fetch(`/api/patient/${PATIENT_ID}/memory-network`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Could not load memory connections.");
        memoryNetworkCache = data;
        const source = document.getElementById("networkSource");
        const target = document.getElementById("networkTarget");
        const options = '<option value="">Choose a memory</option>' + data.memories.map(m =>
            `<option value="${m.id}">${escapeHtml(m.title)} (${escapeHtml(m.category)})</option>`).join("");
        source.innerHTML = options;
        target.innerHTML = options;
        if (!data.links.length) {
            list.innerHTML = '<p class="empty">No connections yet. Choose two memories above to build your family memory story.</p>';
            return;
        }
        const byId = new Map(data.memories.map(m => [m.id, m]));
        list.innerHTML = data.links.map(link => {
            const a = byId.get(link.source_memory_id), b = byId.get(link.target_memory_id);
            if (!a || !b) return "";
            return `<article class="connection-card"><strong>${escapeHtml(a.title)}</strong><span>${escapeHtml(link.relationship_label)}</span><strong>${escapeHtml(b.title)}</strong><button type="button" class="delete" onclick="removeMemoryConnection(${link.id})" aria-label="Remove connection">Remove</button></article>`;
        }).join("");
    } catch (error) {
        list.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
    }
}

async function createMemoryConnection() {
    const source = Number(document.getElementById("networkSource").value);
    const target = Number(document.getElementById("networkTarget").value);
    const label = document.getElementById("networkLabel").value.trim() || "Related to";
    const message = document.getElementById("networkMessage");
    if (!source || !target) { message.textContent = "Please choose both memories."; return; }
    if (source === target) { message.textContent = "Choose two different memories."; return; }
    try {
        const response = await fetch(`/api/patient/${PATIENT_ID}/memory-network/links`, {
            method: "POST", headers: {"Content-Type":"application/json"},
            body: JSON.stringify({patient_id:PATIENT_ID,source_memory_id:source,target_memory_id:target,relationship_label:label})
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Could not connect these memories.");
        message.textContent = "Connection saved.";
        await loadMemoryNetwork();
    } catch (error) { message.textContent = error.message; }
}

async function removeMemoryConnection(id) {
    if (!confirm("Remove this connection? The memories themselves will remain.")) return;
    const response = await fetch(`/api/patient/${PATIENT_ID}/memory-network/links/${id}`, {method:"DELETE"});
    if (!response.ok) { alert("Could not remove this connection."); return; }
    await loadMemoryNetwork();
}

async function loadContextualMemoryCues() {
    const container = document.getElementById("contextCueList");
    if (!container) return;
    try {
        const response = await fetch(`/api/patient/${PATIENT_ID}/memory-cues`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Could not load prompts.");
        container.innerHTML = data.cues.length ? data.cues.slice(0,3).map(cue =>
            `<article class="context-cue-card"><strong>${escapeHtml(cue.title)}</strong><p>${escapeHtml(cue.context)}</p><span>${escapeHtml(cue.prompt)}</span></article>`
        ).join("") : '<p class="empty">Add a few memories to see optional prompts here.</p>';
    } catch (error) { container.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`; }
}
