# Agent Hub

Local desktop prototype for chatting with multiple local agents from one UI.

The UI is group-chat styled: each agent has an avatar, every reply is shown as a chat bubble, and each member can be assigned a per-turn hierarchy level.

The left sidebar has two routing controls:

- `Private`: choose one agent and the composer sends only to that CLI/adapter.
- `Agents`: choose the members used for group chat when `Group chat` is selected under Private.

Group chat runs in shared-context order: agents speak by hierarchy rank, and each later agent receives the previous replies from the same turn. This is closer to a real group chat than parallel broadcast.

Agent Hub also keeps a local shared memory file. Each completed turn is appended to `data/memory.jsonl`, and a rolling summary is kept in `data/summaries.json`. Future turns receive that summary plus recent memory in their prompt, so long conversations do not depend only on the visible chat transcript.

Current agents:

- `codex`: primary controller. It uses HTTP when `CODEX_REMOTE_HTTP` is set. CLI fallback is opt-in.
- `hermes`: read-only scout via `hermes --oneshot`.
- `opencode`: read-only scout through Docker image `opencode:latest`.

Codex is shown in the group by default. If Codex is checked without an HTTP endpoint or CLI opt-in, it replies with a configuration note instead of failing. Hermes and opencode are enabled by default.

## Hierarchy

Each selected agent can be assigned one level before sending:

- `Lead`: main synthesizer for the turn.
- `Deputy`: second-in-command, expected to challenge gaps and support the lead.
- `Member`: normal participant.
- `Scout`: read-only, risk-focused participant.

The hierarchy is sent with every chat request, so it can be changed freely from turn to turn.

In group chat, lower rank speaks first: `Lead`, then `Deputy`, then `Member`, then `Scout`.

## Shared Memory

Shared memory is local-first and intentionally simple:

- `data/memory.jsonl`: append-only chat turn records.
- `data/summaries.json`: rolling summary used in future prompts.
- `/api/memory`: read-only endpoint used by the sidebar memory panel.

The `data/` directory is ignored by Git so private chat history is not published accidentally.

Optional agentmemory sync can be enabled with:

```powershell
$env:AGENT_HUB_AGENTMEMORY = "1"
```

When enabled, Agent Hub tries to write compact turn summaries to the local agentmemory service. Failures are ignored so chat still works when agentmemory is unavailable.

## Run

```powershell
npm install
npm run desktop
```

For browser-only testing:

```powershell
npm install
npm start
```

Then open `http://127.0.0.1:17771`.

## Codex Transport

Codex does not use WebSocket in this prototype. It uses this order:

1. `CODEX_REMOTE_HTTP` if set.
2. `codex exec` CLI fallback only when `AGENT_HUB_ENABLE_CODEX_CLI=1`.

Example:

```powershell
$env:CODEX_REMOTE_HTTP = "http://127.0.0.1:1455"
npm run desktop
```

To explicitly allow CLI fallback:

```powershell
$env:AGENT_HUB_ENABLE_CODEX_CLI = "1"
```

Hermes uses:

```powershell
hermes --oneshot "<prompt>" --ignore-rules --provider huoshan --model deepseek-v4-flash-260425
```

Agent Hub defaults Hermes to `huoshan/deepseek-v4-flash-260425` because the global Hermes default `oneapi-relay/deepseek-ai/deepseek-v4-flash` has returned intermittent 502s from the relay. Override per Agent Hub process with:

```powershell
$env:AGENT_HUB_HERMES_PROVIDER = "chinamobile"
$env:AGENT_HUB_HERMES_MODEL = "minimax-m25"
```

opencode uses Docker:

```powershell
docker run --rm -v <workspace>:/workspace:ro -w /workspace opencode:latest run "<prompt>"
```

Agent Hub mounts the current workspace read-only at `/workspace`.

Timeouts:

- Codex CLI: 45 seconds.
- Hermes CLI: 180 seconds.
- opencode Docker: 90 seconds.

The adapters are intentionally conservative. Hermes and opencode are treated as read-only scouts, and Codex is treated as the default final controller.

Workspace root defaults to two levels above `outputs/agent-hub`. Override with `AGENT_HUB_WORKSPACE`.

## Publishing

This project is safe to publish as source code as long as local `.env` files, logs, `data/`, and `node_modules/` are not committed. The `.gitignore` excludes those generated files.
