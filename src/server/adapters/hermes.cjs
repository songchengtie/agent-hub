const { runCommand } = require("../transports/process.cjs");
const { formatTranscript } = require("../transcript.cjs");
const { formatMemoryContext } = require("../memory.cjs");

function createHermesAdapter() {
  const provider = process.env.AGENT_HUB_HERMES_PROVIDER || "huoshan";
  const model = process.env.AGENT_HUB_HERMES_MODEL || "deepseek-v4-flash-260425";

  return {
    id: "hermes",
    label: "Hermes",
    role: "scout",
    describe() {
      return {
        id: this.id,
        label: this.label,
        role: this.role,
        capabilities: ["read-only-scout", "local-tools", "analysis"],
        transports: ["cli"],
        policy: `Read-only scouting via hermes --oneshot. Provider: ${provider}. Model: ${model}. CLI timeout: 180s.`
      };
    },
    async run(task) {
      const prompt = [
        "You are Hermes inside Agent Hub.",
        "Do not edit files. Return observations, risks, and suggested next steps.",
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

      const text = await runCommand("hermes", ["--oneshot", prompt, "--ignore-rules", "--provider", provider, "--model", model], {
        cwd: task.cwd,
        timeoutMs: 180000
      });

      return {
        agentId: this.id,
        role: this.role,
        ok: true,
        transport: "cli",
        text,
        events: [{ transport: "cli", attempt: 1, status: "ok" }]
      };
    }
  };
}

function formatAssignment(task, agentId) {
  const assignment = task.hierarchy && task.hierarchy[agentId];
  if (!assignment) return "Scout";
  return `${assignment.label}. ${assignment.instruction}`;
}

module.exports = { createHermesAdapter };
