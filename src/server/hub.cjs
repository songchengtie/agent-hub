const { createCodexAdapter } = require("./adapters/codex.cjs");
const { createHermesAdapter } = require("./adapters/hermes.cjs");
const { createOpencodeAdapter } = require("./adapters/opencode.cjs");
const { normalizeHierarchy, hierarchyPolicy } = require("./hierarchy.cjs");
const { SharedMemory } = require("./memory.cjs");
const path = require("path");

class AgentHub {
  constructor() {
    this.listeners = new Set();
    this.jobs = new Map();
    this.memory = new SharedMemory({ rootDir: process.cwd() });
    this.agents = [
      createCodexAdapter(),
      createHermesAdapter(),
      createOpencodeAdapter()
    ];
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event) {
    for (const listener of this.listeners) listener({ at: new Date().toISOString(), ...event });
  }

  listAgents() {
    return this.agents.map((agent) => agent.describe());
  }

  startDispatch({ message, selectedAgentIds, hierarchy }) {
    if (!message || typeof message !== "string") {
      throw new Error("message is required");
    }

    const selected = new Set(Array.isArray(selectedAgentIds) ? selectedAgentIds : this.agents.map((a) => a.id));
    const selectedIds = this.agents.filter((agent) => selected.has(agent.id)).map((agent) => agent.id);
    const assignments = normalizeHierarchy(selectedIds, hierarchy);
    const agents = this.agents
      .filter((agent) => selected.has(agent.id))
      .sort((a, b) => assignments[a.id].rank - assignments[b.id].rank);
    const id = crypto.randomUUID();
    const job = {
      id,
      status: agents.length === 0 ? "done" : "running",
      message,
      replies: [],
      transcript: [],
      expectedAgentIds: agents.map((agent) => agent.id),
      hierarchy: assignments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.jobs.set(id, job);

    const memoryContext = this.memory.getContext(message);
    const task = {
      message,
      policy: hierarchyPolicy(assignments),
      hierarchy: assignments,
      cwd: resolveWorkspace(),
      transcript: [],
      memoryContext
    };

    this.emit({ type: "user-message", message });

    this.runAgentsForJob(agents, task, job);

    return this.snapshotJob(job);
  }

  async dispatch(input) {
    const job = this.startDispatch(input);
    while (job.status !== "done") {
      await new Promise((resolve) => setTimeout(resolve, 100));
      Object.assign(job, this.getJob(job.id));
    }
    return job;
  }

  getJob(id) {
    const job = this.jobs.get(id);
    if (!job) return null;
    return this.snapshotJob(job);
  }

  listMemory() {
    return this.memory.listMemory();
  }

  async runAgentsForJob(agents, task, job) {
    for (const agent of agents) {
      this.emit({ type: "agent-start", agentId: agent.id });
      const turnTask = {
        ...task,
        transcript: [...job.transcript]
      };

      try {
        const reply = await agent.run(turnTask);
        this.pushReply(job, reply);
        this.emit({ type: "agent-reply", agentId: agent.id, reply });
      } catch (err) {
        const reply = {
          agentId: agent.id,
          role: agent.role,
          ok: false,
          transport: "error",
          text: err.message,
          events: []
        };
        this.pushReply(job, reply);
        this.emit({ type: "agent-error", agentId: agent.id, error: err.message });
      }
    }
    this.memory.recordJob(job);
  }

  pushReply(job, reply) {
    job.replies.push({ completedAt: new Date().toISOString(), ...reply });
    job.transcript.push({
      agentId: reply.agentId,
      role: reply.role,
      ok: reply.ok,
      text: reply.text || ""
    });
    job.updatedAt = new Date().toISOString();
    if (job.replies.length >= job.expectedAgentIds.length) {
      job.status = "done";
    }
  }

  snapshotJob(job) {
    return {
      id: job.id,
      status: job.status,
      message: job.message,
      replies: [...job.replies],
      transcript: [...job.transcript],
      expectedAgentIds: [...job.expectedAgentIds],
      hierarchy: { ...job.hierarchy },
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };
  }
}

function resolveWorkspace() {
  return process.env.AGENT_HUB_WORKSPACE || path.resolve(process.cwd(), "../..");
}

module.exports = { AgentHub };
