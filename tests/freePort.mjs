import net from "node:net";

const [start, span] = process.argv.slice(2).map(Number);

function isFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "0.0.0.0");
  });
}

for (let i = 0; i < span; i += 1) {
  const port = start + (i % span);
  if (await isFree(port)) {
    process.stdout.write(String(port));
    process.exit(0);
  }
}

process.exit(1);
