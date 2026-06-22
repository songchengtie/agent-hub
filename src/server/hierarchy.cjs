const HIERARCHY = {
  lead: {
    label: "Lead",
    rank: 0,
    instruction: "You are the lead speaker for this turn. Give the final synthesis when useful."
  },
  deputy: {
    label: "Deputy",
    rank: 1,
    instruction: "You are the deputy speaker for this turn. Challenge gaps and support the lead."
  },
  member: {
    label: "Member",
    rank: 2,
    instruction: "You are a normal group member for this turn. Contribute a concise view."
  },
  scout: {
    label: "Scout",
    rank: 3,
    instruction: "You are a read-only scout for this turn. Surface observations and risks without taking final authority."
  }
};

const DEFAULT_HIERARCHY = {
  codex: "lead",
  hermes: "scout",
  opencode: "scout"
};

function normalizeHierarchy(selectedAgentIds, requested) {
  const assignments = {};
  for (const id of selectedAgentIds) {
    const level = requested && HIERARCHY[requested[id]] ? requested[id] : DEFAULT_HIERARCHY[id] || "member";
    assignments[id] = {
      level,
      ...HIERARCHY[level]
    };
  }
  return assignments;
}

function hierarchyPolicy(assignments) {
  const rows = Object.entries(assignments)
    .sort((a, b) => a[1].rank - b[1].rank)
    .map(([id, assignment]) => `${id}: ${assignment.label}`)
    .join("; ");
  return `Current group hierarchy: ${rows || "none"}. Respect this hierarchy for this turn.`;
}

module.exports = { HIERARCHY, DEFAULT_HIERARCHY, normalizeHierarchy, hierarchyPolicy };
