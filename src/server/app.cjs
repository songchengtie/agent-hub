const http = require("http");
const fs = require("fs");
const path = require("path");
const { AgentHub } = require("./hub.cjs");

const rendererDir = path.resolve(__dirname, "../renderer");
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function serveStatic(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.resolve(rendererDir, `.${requested}`);

  if (!filePath.startsWith(rendererDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "content-type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(data);
  });
}

async function startServer({ port }) {
  const hub = new AgentHub();
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");

      if (req.method === "GET" && url.pathname === "/api/agents") {
        sendJson(res, 200, hub.listAgents());
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/memory") {
        sendJson(res, 200, hub.listMemory());
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/chat") {
        const body = await readBody(req);
        const result = hub.startDispatch(body);
        sendJson(res, 200, result);
        return;
      }

      if (req.method === "GET" && url.pathname.startsWith("/api/chat/")) {
        const id = decodeURIComponent(url.pathname.slice("/api/chat/".length));
        const job = hub.getJob(id);
        if (!job) {
          sendJson(res, 404, { error: "chat not found" });
          return;
        }
        sendJson(res, 200, job);
        return;
      }

      serveStatic(req, res);
    } catch (err) {
      sendJson(res, 500, { error: err.message, stack: process.env.NODE_ENV === "development" ? err.stack : undefined });
    }
  });

  const actualPort = await listenOnAvailablePort(server, port);

  return {
    port: actualPort,
    close() {
      server.close();
    }
  };
}

function listenOnAvailablePort(server, preferredPort) {
  return new Promise((resolve, reject) => {
    let candidate = preferredPort;

    function tryListen() {
      server.once("error", onError);
      server.listen(candidate, "127.0.0.1", () => {
        server.off("error", onError);
        resolve(candidate);
      });
    }

    function onError(err) {
      server.off("error", onError);
      if (err.code === "EADDRINUSE" && candidate < preferredPort + 20) {
        candidate += 1;
        tryListen();
        return;
      }
      reject(err);
    }

    tryListen();
  });
}

module.exports = { startServer };
