import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import type { ViteDevServer } from "vite";
import type { DashboardState } from "./state.js";

const PORT = 8765;
const USER = "pi";

export async function startDashboard(root: string, state: DashboardState) {
  const password = randomBytes(24).toString("base64url");
  const expected = Buffer.from(`${USER}:${password}`);
  const clients = new Set<ServerResponse>();
  let vite: ViteDevServer | undefined;
  const authorized = (header: string | undefined) => {
    if (!header?.startsWith("Basic ")) return false;
    const encoded = header.slice(6);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length > 512) return false;
    const actual = Buffer.from(encoded, "base64");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  };
  const server = createServer((req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!authorized(req.headers.authorization)) {
      res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Pi token dashboard"' });
      res.end("Authentication required");
      return;
    }
    const path = new URL(req.url ?? "/", "http://internal").pathname;
    if (req.method !== "GET") { res.writeHead(405); res.end(); return; }
    if (path === "/api/snapshot") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(state.snapshot()));
    } else if (path === "/api/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write(`retry: 1500\nevent: snapshot\ndata: ${JSON.stringify(state.snapshot())}\n\n`);
      clients.add(res);
      const timer = setInterval(() => res.write(": heartbeat\n\n"), 15000);
      res.on("close", () => { clearInterval(timer); clients.delete(res); });
    } else if (vite) {
      vite.middlewares(req, res, () => { res.writeHead(404); res.end("Not found"); });
    } else { res.writeHead(503); res.end("Starting"); }
  });
  const unsubscribe = state.subscribe((snapshot) => {
    const frame = `event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`;
    for (const client of clients) client.write(frame);
  });
  try {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({ root, configFile: resolve(root, "vite.config.ts"), appType: "spa", optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, fs: { strict: true, allow: [root] }, hmr: false }, logLevel: "error" });
    // Middleware mode otherwise starts an unauthenticated websocket on 24678, even with HMR disabled.
    await vite.ws.close();
    await new Promise<void>((ok, fail) => {
      server.once("error", fail);
      server.listen(PORT, "0.0.0.0", () => { server.off("error", fail); ok(); });
    });
  } catch (error) {
    unsubscribe();
    await vite?.close();
    throw error;
  }
  return {
    password,
    port: PORT,
    async close() {
      unsubscribe();
      for (const client of clients) client.end();
      clients.clear();
      server.closeAllConnections();
      await vite?.close();
      await new Promise<void>((ok) => server.close(() => ok()));
    },
  };
}
