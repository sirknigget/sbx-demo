import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { DashboardState } from "./state.js";
import { startDashboard } from "./server.js";

export default function (pi: ExtensionAPI) {
  let state = new DashboardState();
  let service: Awaited<ReturnType<typeof startDashboard>> | undefined;
  let run: string | undefined;
  const turns = new Map<number, string>();
  const tools = new Map<string, string>();
  let counted = new WeakSet<object>();
  const responseIds = new Set<string>();

  pi.on("session_start", async (_event, ctx) => {
    if (service) await service.close();
    service = undefined;
    state = new DashboardState();
    counted = new WeakSet<object>();
    responseIds.clear();
    tools.clear();
    turns.clear();
    run = undefined;
    state.setModel(ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "—");
    try {
      service = await startDashboard(dirname(fileURLToPath(import.meta.url)), state);
      if (ctx.hasUI) {
        ctx.ui.notify(`Pi token dashboard running on 0.0.0.0:${service.port} — HTTP Basic user: pi  password: ${service.password}`, "info");
        ctx.ui.setStatus("token-dashboard", `Dashboard :${service.port}`);
      }
    } catch (error) {
      const message = (error as NodeJS.ErrnoException).code === "EADDRINUSE"
        ? "port 8765 is already in use"
        : error instanceof Error ? error.message : String(error);
      if (ctx.hasUI) ctx.ui.notify(`Pi token dashboard failed: ${message}`, "error");
      else console.error(`Pi token dashboard failed: ${message}`);
    }
  });
  pi.on("session_shutdown", async (_event, ctx) => {
    const current = service;
    service = undefined;
    await current?.close();
    if (ctx.hasUI) ctx.ui.setStatus("token-dashboard", undefined);
  });
  pi.on("model_select", (event) => state.setModel(`${event.model.provider}/${event.model.id}`));
  pi.on("agent_start", () => { run = state.start("run", "Agent run"); });
  pi.on("agent_end", (event) => {
    const failed = event.messages.some((message) => message.role === "assistant" && (message.stopReason === "error" || message.stopReason === "aborted"));
    if (run) state.end(run, failed ? "error" : "success");
    run = undefined;
  });
  pi.on("turn_start", (event) => turns.set(event.turnIndex, state.start("turn", `Turn ${event.turnIndex + 1}`, undefined, event.timestamp)));
  pi.on("turn_end", (event) => {
    const id = turns.get(event.turnIndex);
    if (id) state.end(id, event.outcome === "completed" ? "success" : "error");
    turns.delete(event.turnIndex);
  });
  pi.on("tool_execution_start", (event) => tools.set(event.toolCallId, state.start("tool", event.toolName)));
  pi.on("tool_execution_end", (event) => {
    const id = tools.get(event.toolCallId);
    if (id) state.end(id, event.isError ? "error" : "success");
    tools.delete(event.toolCallId);
  });
  pi.on("message_end", (event) => {
    const message = event.message;
    if (message.role !== "assistant" || counted.has(message)) return;
    counted.add(message);
    if (message.responseId) {
      const key = `${message.provider}/${message.model}/${message.responseId}`;
      if (responseIds.has(key)) return;
      responseIds.add(key);
    }
    const { input, output, cacheRead, cacheWrite, totalTokens } = message.usage;
    state.message(`${message.provider}/${message.model}`, { input, output, cacheRead, cacheWrite, totalTokens },
      message.stopReason === "error" || message.stopReason === "aborted" ? "error" : "success", message.timestamp);
  });
}
