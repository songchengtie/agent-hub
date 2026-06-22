const assert = require("assert");
const { createCodexAdapter } = require("../src/server/adapters/codex.cjs");
const { createHermesAdapter } = require("../src/server/adapters/hermes.cjs");
const { createOpencodeAdapter } = require("../src/server/adapters/opencode.cjs");
const { AgentHub } = require("../src/server/hub.cjs");
const { normalizeHierarchy } = require("../src/server/hierarchy.cjs");
const { formatMemoryContext } = require("../src/server/memory.cjs");

async function checkAgents() {
  const codex = createCodexAdapter().describe();
  const hermes = createHermesAdapter().describe();
  const opencode = createOpencodeAdapter().describe();
  assert.equal(codex.id, "codex");
  assert.equal(hermes.id, "hermes");
  assert.equal(opencode.id, "opencode");
  assert(!codex.transports.includes("ws"));
  assert(codex.policy.includes("No WebSocket"));
  assert(hermes.policy.includes("Read-only"));
  assert(opencode.transports.includes("docker"));
}

async function checkPollingJob() {
  const hub = new AgentHub();
  const job = hub.startDispatch({ message: "noop", selectedAgentIds: [] });
  assert.equal(job.status, "done");
  assert.deepEqual(job.replies, []);
  assert.equal(hub.getJob(job.id).id, job.id);
}

async function checkHierarchy() {
  const assignments = normalizeHierarchy(["codex", "hermes", "opencode"], {
    codex: "member",
    hermes: "lead",
    opencode: "deputy"
  });
  assert.equal(assignments.hermes.label, "Lead");
  assert.equal(assignments.opencode.label, "Deputy");
  assert.equal(assignments.codex.label, "Member");

  const hub = new AgentHub();
  const job = hub.startDispatch({
    message: "noop",
    selectedAgentIds: [],
    hierarchy: { codex: "scout" }
  });
  assert.deepEqual(job.expectedAgentIds, []);
}

async function checkMemory() {
  const hub = new AgentHub();
  assert(hub.listMemory());
  const formatted = formatMemoryContext({ local: "Summary: test", agentmemory: "" });
  assert(formatted.includes("Summary: test"));
}

Promise.all([checkAgents(), checkPollingJob(), checkHierarchy(), checkMemory()]).then(() => {
  console.log("checks passed");
});
