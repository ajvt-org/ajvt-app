import { createServer } from "http";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE = readFileSync(join(__dirname, "../public/deploying.html"));
const LOGO = readFileSync(join(__dirname, "../public/version-final.png"));

export function startHoldingServer(port) {
  const server = createServer((req, res) => {
    if (req.url === "/api/health") {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false }));
      return;
    }
    if (req.url === "/version-final.png") {
      res.writeHead(200, { "content-type": "image/png" });
      res.end(LOGO);
      return;
    }
    res.writeHead(503, { "content-type": "text/html; charset=utf-8" });
    res.end(PAGE);
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}
