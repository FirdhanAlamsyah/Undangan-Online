const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 5173);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
};

const fallbacks = new Map([
  [
    path.join(root, "assets", "background-desktop.png"),
    [
      path.join(root, "assets", "background-desktop.jpg"),
      path.join(root, "assets", "background-desktop.jpeg"),
      path.join(root, "assets", "background-desktop.webp"),
      path.join(root, "assets", "background-desktop.svg"),
    ],
  ],
  [
    path.join(root, "assets", "cover-main.png"),
    [
      path.join(root, "assets", "cover-main.jpg"),
      path.join(root, "assets", "cover-main.jpeg"),
      path.join(root, "assets", "cover-main.webp"),
      path.join(root, "assets", "opening-placeholder.svg"),
    ],
  ],
  [
    path.join(root, "assets", "opening-main.png"),
    [
      path.join(root, "assets", "cover-main.png"),
      path.join(root, "assets", "cover-main.jpg"),
      path.join(root, "assets", "cover-main.jpeg"),
      path.join(root, "assets", "cover-main.webp"),
      path.join(root, "assets", "opening-placeholder.svg"),
    ],
  ],
]);

function resolveFile(url) {
  const parsed = new URL(url, `http://localhost:${port}`);
  const pathname = decodeURIComponent(parsed.pathname);
  const requested = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const file = path.resolve(root, `.${requested}`);

  if (!file.startsWith(root)) return null;
  return file;
}

const server = http.createServer((req, res) => {
  if (req.url === "/favicon.ico") {
    res.writeHead(204, { "Cache-Control": "no-store" });
    res.end();
    return;
  }

  const file = resolveFile(req.url);

  if (!file) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const fallback = fallbacks.get(file);
  const sourceFile = fs.existsSync(file)
    ? file
    : fallback?.find((candidate) => fs.existsSync(candidate));

  if (!sourceFile) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  fs.readFile(sourceFile, (error, body) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(sourceFile)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Undangan server running at http://127.0.0.1:${port}/`);
});
