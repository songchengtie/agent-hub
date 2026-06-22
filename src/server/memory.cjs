const fs = require("fs");
const path = require("path");

class SharedMemory {
  constructor({ rootDir }) {
    this.dataDir = path.join(rootDir, "data");
    this.memoryFile = path.join(this.dataDir, "memory.jsonl");
    this.summaryFile = path.join(this.dataDir, "summaries.json");
    fs.mkdirSync(this.dataDir, { recursive: true });
  }

  getContext(query) {
    const recent = this.readRecent(6);
    const summaries = this.readSummaries();
    const local = [
      summaries.current ? `Summary:\n${summaries.current}` : "Summary: none yet.",
      recent.length > 0 ? `Recent memory:\n${recent.map(formatEntry).join("\n\n")}` : "Recent memory: none yet."
    ].join("\n\n");

    return {
      local,
      agentmemory: ""
    };
  }

  recordJob(job) {
    const entry = {
      type: "chat_turn",
      at: new Date().toISOString(),
      message: job.message,
      expectedAgentIds: job.expectedAgentIds,
      hierarchy: job.hierarchy,
      transcript: job.transcript
    };
    fs.appendFileSync(this.memoryFile, `${JSON.stringify(entry)}\n`, "utf8");
    this.updateSummary(entry);
    this.rememberAgentMemory(entry);
  }

  listMemory() {
    return {
      summaries: this.readSummaries(),
      recent: this.readRecent(20)
    };
  }

  readRecent(limit) {
    if (!fs.existsSync(this.memoryFile)) return [];
    const lines = fs.readFileSync(this.memoryFile, "utf8").trim().split(/\r?\n/).filter(Boolean);
    return lines.slice(-limit).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  readSummaries() {
    if (!fs.existsSync(this.summaryFile)) return { current: "" };
    try {
      return JSON.parse(fs.readFileSync(this.summaryFile, "utf8"));
    } catch {
      return { current: "" };
    }
  }

  updateSummary(entry) {
    const summaries = this.readSummaries();
    const compact = summarizeEntry(entry);
    const previous = summaries.current ? `${summaries.current}\n` : "";
    summaries.current = `${previous}- ${compact}`.split(/\r?\n/).slice(-30).join("\n");
    summaries.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.summaryFile, JSON.stringify(summaries, null, 2), "utf8");
  }

  recallAgentMemory(query) {
    if (process.env.AGENT_HUB_AGENTMEMORY !== "1") return Promise.resolve("");
    return postAgentMemory("/smart-search", { query, limit: 5 }).then((data) => JSON.stringify(data)).catch(() => "");
  }

  rememberAgentMemory(entry) {
    if (process.env.AGENT_HUB_AGENTMEMORY !== "1") return;
    const content = summarizeEntry(entry);
    postAgentMemory("/remember", {
      content,
      concepts: ["agent-hub", "shared-memory"]
    }).catch(() => {});
  }
}

function formatMemoryContext(memoryContext) {
  if (!memoryContext) return "No shared memory available.";
  const parts = [];
  if (memoryContext.local) parts.push(memoryContext.local);
  if (memoryContext.agentmemory) parts.push(`Agentmemory:\n${memoryContext.agentmemory}`);
  return parts.join("\n\n") || "No shared memory available.";
}

function formatEntry(entry) {
  const speakers = (entry.transcript || []).map((turn) => `${turn.agentId}: ${String(turn.text || "").slice(0, 240)}`).join("\n");
  return `User: ${entry.message}\n${speakers}`;
}

function summarizeEntry(entry) {
  const speakers = (entry.transcript || []).map((turn) => `${turn.agentId}=${String(turn.text || "").replace(/\s+/g, " ").slice(0, 140)}`).join("; ");
  return `User asked "${String(entry.message).replace(/\s+/g, " ").slice(0, 160)}"; replies: ${speakers}`;
}

async function postAgentMemory(pathname, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`http://localhost:3111/agentmemory${pathname}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`agentmemory ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { SharedMemory, formatMemoryContext };
