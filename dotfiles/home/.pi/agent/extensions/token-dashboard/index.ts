import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createDashboard } from './dashboard.js';

export default function (pi: ExtensionAPI) {
  let dashboard: ReturnType<typeof createDashboard> | undefined;
  let run = 0;
  let turn = 0;
  let runFailed = false;
  const root = join(dirname(fileURLToPath(import.meta.url)), 'dist');
  pi.on('session_start', async (_event, ctx) => {
    if (dashboard) await dashboard.close();
    dashboard = createDashboard({ root, log: text => {
      if (ctx.hasUI) ctx.ui.notify(text, 'info');
      else console.error(text);
    }, error: text => {
      if (ctx.hasUI) ctx.ui.notify(text, 'error');
      else console.error(text);
    } });
    await dashboard.open();
    if (ctx.model) dashboard.selectModel(`${ctx.model.provider}/${ctx.model.id}`);
  });
  pi.on('model_select', event => dashboard?.selectModel(`${event.model.provider}/${event.model.id}`));
  pi.on('agent_start', () => { runFailed = false; dashboard?.start('run', ++run, 'Agent run'); });
  pi.on('agent_end', () => dashboard?.end('run', run, runFailed ? 'error' : 'success'));
  pi.on('turn_start', () => dashboard?.start('turn', ++turn, 'Turn'));
  pi.on('turn_end', event => { if (event.outcome !== 'completed') runFailed = true; dashboard?.end('turn', turn, event.outcome === 'completed' ? 'success' : 'error'); });
  pi.on('tool_execution_start', event => dashboard?.start('tool', event.toolCallId, event.toolName));
  pi.on('tool_execution_end', event => { if (event.isError) runFailed = true; dashboard?.end('tool', event.toolCallId, event.isError ? 'error' : 'success'); });
  pi.on('message_end', event => { if (event.message.role === 'assistant' && ['error', 'aborted'].includes(event.message.stopReason)) runFailed = true; dashboard?.message(event.message); });
  pi.on('session_shutdown', async () => { await dashboard?.close(); dashboard = undefined; });
}
