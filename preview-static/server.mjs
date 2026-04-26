import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? "3000");

const contentTypeByExt = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function safeJoin(base, target) {
  const targetPath = path.normalize(path.join(base, target));
  if (!targetPath.startsWith(base)) return null;
  return targetPath;
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const reqPath = u.pathname === "/" ? "/index.html" : u.pathname;
    const filePath = safeJoin(__dirname, "." + reqPath);
    if (!filePath) {
      res.writeHead(400);
      res.end("bad request");
      return;
    }

    const ext = path.extname(filePath);
    const ct = contentTypeByExt[ext] ?? "application/octet-stream";

    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": ct });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(port, () => {
  console.log(`Static preview on http://localhost:${port}`);
});

