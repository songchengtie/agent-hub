const { app, BrowserWindow } = require("electron");
const { loadLocalEnv } = require("./server/env.cjs");
const { startServer } = require("./server/app.cjs");

let server;

async function createWindow() {
  loadLocalEnv();
  const port = Number(process.env.AGENT_HUB_PORT || 17771);
  server = await startServer({ port });

  const win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 920,
    minHeight: 620,
    title: "Agent Hub",
    backgroundColor: "#f7f5ef",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadURL(`http://127.0.0.1:${server.port}`);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (server) server.close();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
