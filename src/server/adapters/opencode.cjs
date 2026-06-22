const { runCommand } = require("../transports/process.cjs");
const { formatTranscript } = require("../transcript.cjs");
const { formatMemoryContext } = require("../memory.cjs");

function createOpencodeAdapter() {
  return {
    id: "opencode",
    label: "opencode",
    role: "scout",
    describe() {
      return {
        id: this.id,
        label: this.label,
        role: this.role,
        capabilities: ["read-only-scout", "docker", "code-analysis"],
        transports: ["docker"],
        policy: "Runs opencode:latest through Docker with the workspace mounted read-only. CLI timeout: 90s."
      };
    },
    async run(task) {
      const prompt = [
        "You are opencode inside Agent Hub.",
        "You are running in a Docker container with the workspace mounted read-only at /workspace.",
        "Do not attempt to edit files. Return observations, risks, and suggested next steps.",
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

      const text = await runCommand("docker", [
        "run",
        "--rm",
        "-v",
        `${task.cwd}:/workspace:ro`,
        "-w",
        "/workspace",
        "opencode:latest",
        "run",
        prompt
      ], {
        cwd: task.cwd,
        timeoutMs: 90000
      });

      return {
        agentId: this.id,
        role: this.role,
        ok: true,
        transport: "docker",
        text,
        events: [{ transport: "docker", attempt: 1, status: "ok", image: "opencode:latest" }]
      };
    }
  };
}

function formatAssignment(task, agentId) {
  const assignment = task.hierarchy && task.hierarchy[agentId];
  if (!assignment) return "Scout";
  return `${assignment.label}. ${assignment.instruction}`;
}

module.exports = { createOpencodeAdapter };
