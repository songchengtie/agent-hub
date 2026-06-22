const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const ignoredDirs = new Set(["node_modules", ".git"]);
const patterns = [
  /sk-[A-Za-z0-9_-]{16,}/,
  /sk-or-[A-Za-z0-9_-]+/,
  /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
  /admin123/i
];

const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!isTextFile(fullPath)) continue;
    if (path.relative(root, fullPath) === path.join("scripts", "scan-secrets.cjs")) continue;
    const text = fs.readFileSync(fullPath, "utf8");
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        findings.push(path.relative(root, fullPath));
        break;
      }
    }
  }
}

function isTextFile(filePath) {
  return /\.(cjs|js|json|md|html|css|txt|gitignore|yml|yaml)$/i.test(filePath) || path.basename(filePath) === "LICENSE";
}

walk(root);

if (findings.length > 0) {
  console.error("Potential secrets found:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("secret scan passed");
