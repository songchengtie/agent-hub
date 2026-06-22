function formatTranscript(turns) {
  if (!turns || turns.length === 0) {
    return "No previous agent replies in this turn.";
  }

  return turns
    .map((turn, index) => {
      const status = turn.ok ? "ok" : "error";
      return `${index + 1}. ${turn.agentId} (${turn.role}, ${status}):\n${turn.text}`;
    })
    .join("\n\n");
}

module.exports = { formatTranscript };
