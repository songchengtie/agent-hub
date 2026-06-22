const { loadLocalEnv } = require("./env.cjs");
const { startServer } = require("./app.cjs");

loadLocalEnv();

const port = Number(process.env.AGENT_HUB_PORT || 17771);

startServer({ port }).then((server) => {
  console.log(`Agent Hub listening on http://127.0.0.1:${server.port}`);
});
