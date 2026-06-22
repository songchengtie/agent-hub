const { runCommand } = require("../transports/process.cjs");
const { formatTranscript } = require("../transcript.cjs");
const { formatMemoryContext } = require("../memory.cjs");

function createCodexAdapter() {
  return {
    id: "codex",
    label: "Codex",
    role: "controller",
    describe() {
      return {
        id: this.id,
        label: this.label,
        role: this.role,
        capabilities: ["final-judgement", "planning", "code-edits"],
        transports: ["http", "cli"],
        policy: "No WebSocket. HTTP first when configured. CLI is opt-in with AGENT_HUB_ENABLE_CODEX_CLI=1."
      };
    },
    async run(task) {
      const prompt = [
        "You are Codex inside Agent Hub.",
        "Keep the response concise and actionable.",
        `Your hierarchy assignment: ${formatAssignment(task, this.id)}`,
        `Policy: ${task.policy}`,
        "",
        "Shared memory for this group:",
        formatMemoryContext(task.memoryContext),
        "",
        "Previous agent replies in this turn:",
        formatTranscript(task.transcript),
        "",
        "User message:",
        task.message
      ].join("\n");

      const events = [];
      let result;

      if (process.env.CODEX_REMOTE_HTTP) {
        try {
          events.push({ transport: "http", attempt: 1, status: "start" });
          const text = await runCodexHttp(process.env.CODEX_REMOTE_HTTP, prompt);
          events.push({ transport: "http", attempt: 1, status: "ok" });
          result = { transport: "http", text, events };
        } catch (err) {
          events.push({ transport: "http", attempt: 1, status: "failed", error: err.message });
        }
      }

      if (!result) {
        if (process.env.AGENT_HUB_ENABLE_CODEX_CLI !== "1") {
          return {
            agentId: this.id,
            role: this.role,
            ok: true,
            transport: "disabled",
            text: "Codex is in the group, but direct Codex CLI spawning is disabled. Set CODEX_REMOTE_HTTP for a Codex service, or set AGENT_HUB_ENABLE_CODEX_CLI=1 to allow the slower codex exec fallback.",
            events: [{ transport: "cli", attempt: 0, status: "disabled" }]
          };
        }
        events.push({ transport: "cli", attempt: 1, status: "start" });
        const text = await runCommand("codex", ["exec", "--sandbox", "read-only", "--skip-git-repo-check", "--color", "never", prompt], {
          cwd: task.cwd,
          timeoutMs: 45000
        });
        events.push({ transport: "cli", attempt: 1, status: "ok" });
        result = { transport: "cli", text, events };
      }

      return {
        agentId: this.id,
        role: this.role,
        ok: true,
        ...result
      };
    }
  };
}

function formatAssignment(task, agentId) {
  const assignment = task.hierarchy && task.hierarchy[agentId];
  if (!assignment) return "Member";
  return `${assignment.label}. ${assignment.instruction}`;
}

async function runCodexHttp(endpoint, prompt) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    throw new Error(`Codex HTTP failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    return data.text || data.result || JSON.stringify(data);
  }

  return response.text();
}

module.exports = { createCodexAdapter };
