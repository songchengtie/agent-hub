const agentsEl = document.querySelector("#agents");
const privateListEl = document.querySelector("#private-list");
const messagesEl = document.querySelector("#messages");
const composer = document.querySelector("#composer");
const textarea = document.querySelector("#message");
const submitButton = composer.querySelector("button");
const languageSelect = document.querySelector("#language");
const memoryPanelEl = document.querySelector("#memory-panel");
const refreshMemoryButton = document.querySelector("#refresh-memory");

const i18n = {
  en: {
    agents: "Agents",
    privateChat: "Private",
    groupChat: "Group chat",
    policy: "Policy",
    policyItems: [
      "Use Private to call one CLI at a time.",
      "Use Agents checkboxes for group chat.",
      "Scout stays read-only and risk-focused."
    ],
    placeholderGroup: "Ask the group...",
    placeholderPrivate: "Message",
    send: "Send",
    language: "Language",
    you: "You",
    dispatch: "dispatch",
    privateDispatch: "private",
    sentTo: "Sent to",
    noAgents: "no agents",
    memory: "Memory",
    refreshMemory: "Refresh",
    memoryEmpty: "No shared memory yet.",
    memorySummary: "Summary",
    memoryRecent: "Recent",
    waitingReplies: "Waiting for replies in order...",
    requestFailed: "Request failed.",
    repliesReceived: "replies received",
    waitingFor: "Waiting for",
    allReplies: "All replies received.",
    noResponse: "(no response)",
    levels: {
      lead: "Lead",
      deputy: "Deputy",
      member: "Member",
      scout: "Scout"
    }
  },
  zh: {
    agents: "\u6210\u5458",
    privateChat: "\u79c1\u804a",
    groupChat: "\u7fa4\u804a",
    policy: "\u89c4\u5219",
    policyItems: [
      "\u7528\u79c1\u804a\u5355\u72ec\u8c03\u7528\u67d0\u4e2a CLI\u3002",
      "\u7528\u6210\u5458\u52fe\u9009\u6765\u7fa4\u804a\u3002",
      "\u4fa6\u5bdf\u4fdd\u6301\u53ea\u8bfb\uff0c\u4e13\u6ce8\u98ce\u9669\u3002"
    ],
    placeholderGroup: "\u95ee\u7fa4\u91cc\u7684 agent...",
    placeholderPrivate: "\u53d1\u7ed9",
    send: "\u53d1\u9001",
    language: "\u8bed\u8a00",
    you: "\u6211",
    dispatch: "\u6d3e\u53d1",
    privateDispatch: "\u79c1\u804a",
    sentTo: "\u5df2\u53d1\u7ed9",
    noAgents: "\u672a\u9009\u6210\u5458",
    memory: "\u8bb0\u5fc6",
    refreshMemory: "\u5237\u65b0",
    memoryEmpty: "\u6682\u65e0\u5171\u4eab\u8bb0\u5fc6\u3002",
    memorySummary: "\u6458\u8981",
    memoryRecent: "\u6700\u8fd1",
    waitingReplies: "\u6309\u987a\u5e8f\u7b49\u5f85\u56de\u590d...",
    requestFailed: "\u8bf7\u6c42\u5931\u8d25\u3002",
    repliesReceived: "\u6761\u56de\u590d\u5df2\u6536\u5230",
    waitingFor: "\u7b49\u5f85",
    allReplies: "\u5168\u90e8\u56de\u590d\u5df2\u6536\u5230\u3002",
    noResponse: "(\u6ca1\u6709\u56de\u590d)",
    levels: {
      lead: "\u4e3b\u63a7",
      deputy: "\u526f\u624b",
      member: "\u6210\u5458",
      scout: "\u4fa6\u5bdf"
    }
  }
};

const agentVisuals = {
  codex: { initials: "C", color: "#2f5f52", name: "Codex" },
  hermes: { initials: "H", color: "#7b4e2f", name: "Hermes" },
  opencode: { initials: "O", color: "#4e5f8f", name: "opencode" },
  hub: { initials: "A", color: "#6a665b", name: "Agent Hub" },
  user: { initials: "\u6211", color: "#1f7a4d", name: "You" }
};

const defaultHierarchy = {
  codex: "lead",
  hermes: "scout",
  opencode: "scout"
};

const defaultEnabled = {
  codex: true,
  hermes: true,
  opencode: true
};

let agents = [];
let lang = localStorage.getItem("agent-hub-language") || "zh";
let privateAgentId = localStorage.getItem("agent-hub-private-agent") || "";

function t() {
  return i18n[lang] || i18n.zh;
}

function visualFor(id) {
  return agentVisuals[id] || { initials: id.slice(0, 1).toUpperCase(), color: "#59636e", name: id };
}

function avatarHtml(id) {
  const visual = visualFor(id);
  return `<div class="avatar" style="background:${visual.color}">${visual.initials}</div>`;
}

function addMessage({ agentId = "hub", author, text, kind = "agent", meta }) {
  const el = document.createElement("article");
  el.className = `message-row ${kind}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const metaEl = document.createElement("div");
  metaEl.className = "meta";
  metaEl.textContent = meta || author || visualFor(agentId).name;

  const body = document.createElement("div");
  body.className = "body";
  body.textContent = text;

  bubble.append(metaEl, body);

  if (kind === "user") {
    el.append(bubble);
    el.insertAdjacentHTML("beforeend", avatarHtml("user"));
  } else {
    el.insertAdjacentHTML("afterbegin", avatarHtml(agentId));
    el.append(bubble);
  }

  messagesEl.append(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function setMessageText(el, text) {
  const body = el.querySelector(".body");
  if (body) body.textContent = text;
}

function applyLanguage() {
  const copy = t();
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.querySelector("[data-i18n='agents']").textContent = copy.agents;
  document.querySelector("[data-i18n='privateChat']").textContent = copy.privateChat;
  document.querySelector("[data-i18n='policy']").textContent = copy.policy;
  document.querySelector("[data-i18n='language']").textContent = copy.language;
  document.querySelector("[data-i18n='memory']").textContent = copy.memory;
  refreshMemoryButton.textContent = copy.refreshMemory;
  submitButton.textContent = copy.send;
  languageSelect.value = lang;

  const policyList = document.querySelector("#policy-list");
  policyList.replaceChildren();
  for (const item of copy.policyItems) {
    const li = document.createElement("li");
    li.textContent = item;
    policyList.append(li);
  }

  renderPrivateList();
  renderAgents();
  loadMemory();
  updateComposerPlaceholder();
}

function renderPrivateList() {
  privateListEl.replaceChildren();
  const copy = t();
  privateListEl.append(createPrivateButton("", copy.groupChat, "hub"));
  for (const agent of agents) {
    privateListEl.append(createPrivateButton(agent.id, visualFor(agent.id).name, agent.id));
  }
}

function createPrivateButton(agentId, label, avatarId) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `private-button ${privateAgentId === agentId ? "active" : ""}`;
  button.dataset.agentId = agentId;
  button.innerHTML = `${avatarHtml(avatarId)}<span>${label}</span>`;
  button.addEventListener("click", () => {
    privateAgentId = agentId;
    localStorage.setItem("agent-hub-private-agent", privateAgentId);
    renderPrivateList();
    updateComposerPlaceholder();
    textarea.focus();
  });
  return button;
}

function renderAgents() {
  const currentEnabled = selectedAgentIds();
  const currentHierarchy = selectedHierarchy();
  agentsEl.replaceChildren();
  const copy = t();

  for (const agent of agents) {
    const visual = visualFor(agent.id);
    const row = document.createElement("div");
    row.className = "agent";
    row.dataset.agentId = agent.id;
    row.innerHTML = `
      ${avatarHtml(agent.id)}
      <div class="agent-main">
        <label class="agent-toggle">
          <input type="checkbox" value="${agent.id}" checked>
          <span>${visual.name}</span>
        </label>
        <p>${agent.role} / ${agent.transports.join(", ")}</p>
      </div>
      <select aria-label="${visual.name} hierarchy">
        <option value="lead">${copy.levels.lead}</option>
        <option value="deputy">${copy.levels.deputy}</option>
        <option value="member">${copy.levels.member}</option>
        <option value="scout">${copy.levels.scout}</option>
      </select>
    `;

    const checkbox = row.querySelector("input");
    checkbox.checked = currentEnabled.length > 0 ? currentEnabled.includes(agent.id) : defaultEnabled[agent.id] !== false;
    row.querySelector("select").value = currentHierarchy[agent.id] || defaultHierarchy[agent.id] || "member";
    agentsEl.append(row);
  }
}

async function loadAgents() {
  const response = await fetch("/api/agents");
  agents = await response.json();
  if (privateAgentId && !agents.some((agent) => agent.id === privateAgentId)) {
    privateAgentId = "";
  }
  applyLanguage();
}

async function loadMemory() {
  try {
    const response = await fetch("/api/memory");
    const memory = await response.json();
    renderMemory(memory);
  } catch (err) {
    memoryPanelEl.textContent = err.message;
  }
}

function renderMemory(memory) {
  const copy = t();
  memoryPanelEl.replaceChildren();

  const summary = memory && memory.summaries && memory.summaries.current;
  const recent = memory && Array.isArray(memory.recent) ? memory.recent.slice(-3).reverse() : [];

  if (!summary && recent.length === 0) {
    const empty = document.createElement("p");
    empty.className = "memory-empty";
    empty.textContent = copy.memoryEmpty;
    memoryPanelEl.append(empty);
    return;
  }

  if (summary) {
    const block = document.createElement("div");
    block.className = "memory-block";
    const title = document.createElement("strong");
    title.textContent = copy.memorySummary;
    const body = document.createElement("p");
    body.textContent = summary.split(/\r?\n/).slice(-4).join("\n");
    block.append(title, body);
    memoryPanelEl.append(block);
  }

  if (recent.length > 0) {
    const block = document.createElement("div");
    block.className = "memory-block";
    const title = document.createElement("strong");
    title.textContent = copy.memoryRecent;
    block.append(title);

    for (const entry of recent) {
      const item = document.createElement("p");
      item.textContent = String(entry.message || "").slice(0, 120);
      block.append(item);
    }
    memoryPanelEl.append(block);
  }
}

function selectedAgentIds() {
  return [...agentsEl.querySelectorAll("input:checked")].map((input) => input.value);
}

function selectedHierarchy() {
  const hierarchy = {};
  for (const row of agentsEl.querySelectorAll(".agent")) {
    const id = row.dataset.agentId;
    hierarchy[id] = row.querySelector("select").value;
  }
  return hierarchy;
}

function messageTargets() {
  return privateAgentId ? [privateAgentId] : selectedAgentIds();
}

function updateComposerPlaceholder() {
  const copy = t();
  if (privateAgentId) {
    textarea.placeholder = `${copy.placeholderPrivate} ${visualFor(privateAgentId).name}...`;
  } else {
    textarea.placeholder = copy.placeholderGroup;
  }
}

languageSelect.addEventListener("change", () => {
  lang = languageSelect.value;
  localStorage.setItem("agent-hub-language", lang);
  applyLanguage();
});

refreshMemoryButton.addEventListener("click", () => {
  loadMemory();
});

textarea.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    composer.requestSubmit();
  }
});

composer.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = textarea.value.trim();
  if (!message) return;

  const copy = t();
  const targets = messageTargets();
  const hierarchy = selectedHierarchy();
  const meta = privateAgentId ? `${copy.privateDispatch} / ${visualFor(privateAgentId).name}` : copy.you;

  addMessage({ agentId: "user", author: copy.you, text: message, kind: "user", meta });
  const pending = addMessage({
    agentId: "hub",
    author: "Agent Hub",
    meta: privateAgentId ? copy.privateDispatch : copy.dispatch,
    text: `${copy.sentTo} ${targets.join(", ") || copy.noAgents}. ${copy.waitingReplies}`
  });

  textarea.value = "";
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, selectedAgentIds: targets, hierarchy })
    });

    const result = await response.json();
    await pollChat(result.id, pending);
  } catch (err) {
    setMessageText(pending, copy.requestFailed);
    addMessage({ agentId: "hub", author: "Agent Hub", meta: "error", text: err.message });
  } finally {
    submitButton.disabled = false;
    textarea.focus();
  }
});

async function pollChat(id, pending) {
  const shown = new Set();

  while (true) {
    const response = await fetch(`/api/chat/${encodeURIComponent(id)}`);
    const job = await response.json();
    const copy = t();

    for (const reply of job.replies || []) {
      if (shown.has(reply.agentId)) continue;
      shown.add(reply.agentId);
      const transport = reply.transport || "unknown";
      const assignment = job.hierarchy && job.hierarchy[reply.agentId];
      const level = assignment && assignment.level ? copy.levels[assignment.level] : reply.role;
      addMessage({
        agentId: reply.agentId,
        author: reply.agentId,
        meta: `${visualFor(reply.agentId).name} / ${level} / ${transport}`,
        text: reply.text || copy.noResponse
      });
    }

    const waiting = (job.expectedAgentIds || []).filter((agentId) => !shown.has(agentId));
    if (waiting.length > 0) {
      setMessageText(pending, `${shown.size}/${job.expectedAgentIds.length} ${copy.repliesReceived}. ${copy.waitingFor} ${waiting.join(", ")}...`);
    } else {
      setMessageText(pending, `${shown.size}/${job.expectedAgentIds.length} ${copy.repliesReceived}.`);
    }
    if (job.status === "done") {
      setMessageText(pending, copy.allReplies);
      loadMemory();
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

loadAgents();
