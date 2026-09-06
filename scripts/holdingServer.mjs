import { createServer } from "http";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE = readFileSync(join(__dirname, "../public/deploying.html"));
const LOGO = readFileSync(join(__dirname, "../public/logo-mark.svg"));
const FONTS = new Map(
  [400, 700, 800, 900].map((weight) => [
    `/fonts/tajawal-${weight}.woff2`,
    readFileSync(join(__dirname, `../public/fonts/tajawal-${weight}.woff2`)),
  ]),
);

export function startHoldingServer(port) {
  const server = createServer((req, res) => {
    if (req.url === "/api/health") {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false }));
      return;
    }
    if (req.url === "/logo-mark.svg") {
      res.writeHead(200, { "content-type": "image/svg+xml" });
      res.end(LOGO);
      return;
    }
    const font = FONTS.get(req.url);
    if (font) {
      res.writeHead(200, { "content-type": "font/woff2", "cache-control": "public, max-age=3600" });
      res.end(font);
      return;
    }
    res.writeHead(503, { "content-type": "text/html; charset=utf-8" });
    res.end(PAGE);
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}
