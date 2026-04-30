import "dotenv/config";

import http from "node:http";
import app from "./app/server.js";
import io from "./soketio.js";
import { stateConnect } from "./state.js";

async function main() {
  const PORT = process.env.PORT;
  await stateConnect();
  const server = http.createServer(app);
  io.attach(server);

  server.listen(PORT, () => {
    console.log(`server is running on ${PORT}`);
  });
}

main();
