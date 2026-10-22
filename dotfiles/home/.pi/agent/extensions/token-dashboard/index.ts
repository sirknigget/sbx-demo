import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Dashboard } from './dashboard.mjs';

export default function (pi: ExtensionAPI) {
  const dashboard = new Dashboard();
  let run = 0;
  let turn = 0;
  const report = (ctx: any, text: string, level: 'info' | 'error') => {
    if (ctx.mode === 'tui') ctx.ui.notify(text, level);
    else console.error(text.replace(/Password: [^\s]+/, 'Password: [hidden outside TUI]'));
  };

  pi.on('session_start', async (_event, ctx) => {
    if (ctx.model) dashboard.model = `${ctx.model.provider}/${ctx.model.id}`;
    try {
      await dashboard.start();
      report(ctx, `Pi token dashboard running on 0.0.0.0:${dashboard.port} (internal port ${dashboard.port}). HTTP Basic username: pi  Password: ${dashboard.password}`, 'info');
    } catch (error: any) {
      report(ctx, `Pi token dashboard could not start on port ${dashboard.port}: ${error?.code === 'EADDRINUSE' ? 'port already in use' : String(error)}. Pi continues without the dashboard.`, 'error');
    }
  });
  pi.on('session_shutdown', async () => {
    await dashboard.stop();
  });
  pi.on('agent_start', () => dashboard.begin('run', ++run));
  pi.on('agent_end', event => {
    const last = [...event.messages].reverse().find(m => m.role === 'assistant');
    dashboard.end('run', run, last?.role === 'assistant' && ['error', 'aborted'].includes(last.stopReason) ? 'error' : 'success');
  });
  pi.on('turn_start', event => dashboard.begin('turn', ++turn, `Turn ${event.turnIndex + 1}`, event.timestamp));
  pi.on('turn_end', event => dashboard.end('turn', turn, event.outcome === 'completed' ? 'success' : 'error'));
  pi.on('tool_execution_start', event => dashboard.begin('tool', event.toolCallId, event.toolName));
  pi.on('tool_execution_end', event => dashboard.end('tool', event.toolCallId, event.isError ? 'error' : 'success'));
  pi.on('model_select', event => {
    dashboard.model = `${event.model.provider}/${event.model.id}`;
    dashboard.publish();
  });
  pi.on('message_end', event => dashboard.message(event.message));
}
