const fs = require("fs");
const os = require("os");
const path = require("path");

function loadLocalEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    process.env.AGENT_HUB_ENV_FILE,
    path.join(os.homedir(), "AppData", "Local", "hermes", ".env")
  ].filter(Boolean);

  for (const filePath of candidates) {
    loadEnvFile(filePath);
  }
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;

    const key = match[1];
    if (process.env[key]) continue;
    process.env[key] = unquote(match[2].trim());
  }
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

module.exports = { loadLocalEnv };
