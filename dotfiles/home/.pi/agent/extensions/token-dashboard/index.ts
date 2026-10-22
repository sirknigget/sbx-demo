import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { createDashboard } from './dashboard.mjs';

export default function (pi: ExtensionAPI) {
  let dashboard: ReturnType<typeof createDashboard> | undefined;
  pi.on('session_start', async (_event, ctx) => {
    // A new runtime on reload gets a new password. Never print it outside Pi's TUI.
    dashboard = createDashboard();
    try {
      await dashboard.start();
      dashboard.model(ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : null);
      if (ctx.mode === 'tui') ctx.ui.notify(`Pi token dashboard running on 0.0.0.0:${dashboard.port}\nHTTP Basic username: pi\nPassword: ${dashboard.password}\nOpen http://<sandbox-host>:${dashboard.port}/ (enter credentials when prompted).`, 'info');
    } catch (error) {
      const detail = (error as NodeJS.ErrnoException).code === 'EADDRINUSE'
        ? `port ${dashboard.port} is already in use`
        : String(error);
      if (ctx.mode === 'tui') ctx.ui.notify(`Pi token dashboard could not start: ${detail}`, 'error');
      dashboard = undefined;
    }
  });
  pi.on('session_shutdown', async () => { await dashboard?.stop(); dashboard = undefined; });
  pi.on('model_select', event => dashboard?.model(`${event.model.provider}/${event.model.id}`));
  pi.on('agent_start', () => dashboard?.agentStart());
  pi.on('agent_end', () => dashboard?.agentEnd());
  pi.on('turn_start', event => dashboard?.turnStart(event.turnIndex, event.timestamp));
  pi.on('turn_end', event => dashboard?.turnEnd(event.turnIndex, event.outcome));
  pi.on('tool_execution_start', event => dashboard?.toolStart(event.toolCallId, event.toolName));
  pi.on('tool_execution_end', event => dashboard?.toolEnd(event.toolCallId, event.isError));
  pi.on('message_end', event => dashboard?.message(event.message));
}
