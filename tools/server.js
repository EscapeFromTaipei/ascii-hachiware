// Tiny static server for local preview and for tools/build.html.
// - Supports HTTP Range (needed for <video> seeking; python http.server lacks it).
// - POST /save?name=ascii_data.js writes the request body into the project root
//   (only whitelisted names), so the in-browser builder can save its output.
// Usage: node tools/server.js [port]
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2]) || 8766;
const SAVE_WHITELIST = new Set(["ascii_data.js"]);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "POST" && url.pathname === "/log") {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        console.log("[build]", Buffer.concat(chunks).toString("utf8"));
        res.writeHead(200).end("ok");
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/save") {
      const name = url.searchParams.get("name");
      if (!SAVE_WHITELIST.has(name)) {
        res.writeHead(400).end("bad name");
        return;
      }
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        fs.writeFileSync(path.join(ROOT, name), Buffer.concat(chunks));
        console.log("[saved]", name);
        res.writeHead(200).end("saved " + name);
      });
      return;
    }

    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end("not found");
      return;
    }
    const size = fs.statSync(file).size;
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.writeHead(206, {
        "Content-Type": type,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Cache-Control": "no-store",
      });
      fs.createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": size,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(file).pipe(res);
    }
  })
  .listen(PORT, "127.0.0.1", () => console.log(`http://127.0.0.1:${PORT}/`));
