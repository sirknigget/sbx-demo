import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const port = Number(process.env.PORT) || 3001;
const dist = resolve("dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/log") {
    let body = "";
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 4096) {
        response.writeHead(413).end();
        return;
      }
    }
    try {
      const { message } = JSON.parse(body);
      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 500
      )
        throw new Error("Invalid message");
      console.log(`[agentic-engineering] ${message.replace(/[\r\n]/g, " ")}`);
      response.writeHead(204).end();
    } catch {
      response.writeHead(400).end();
    }
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const file =
      pathname === "/"
        ? join(dist, "index.html")
        : resolve(dist, `.${pathname}`);
    if (file !== dist && !file.startsWith(dist + sep))
      throw new Error("Invalid path");
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Not a file");
    const content = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, "0.0.0.0", () =>
  console.log(`Agentic Engineering listening on ${port}`),
);
