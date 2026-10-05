import express from "express";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const app = createApp();
if (process.argv.includes("--dev")) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(`${root}dist`));
  app.get("/{*path}", (_req, res) => res.sendFile(`${root}dist/index.html`));
}
const port = Number(process.env.PORT || 3000);
app.listen(port, "127.0.0.1", () =>
  console.log(`Control Plane is running at http://127.0.0.1:${port}`),
);
