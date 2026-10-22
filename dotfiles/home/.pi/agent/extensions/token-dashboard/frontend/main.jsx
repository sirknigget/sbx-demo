import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const fields = [['input', 'Input'], ['output', 'Output'], ['cacheRead', 'Cache read'], ['cacheWrite', 'Cache write'], ['totalTokens', 'Pi total']];
const time = (value) => value ? new Date(value).toLocaleTimeString() : '—';
const format = (value) => (value ?? 0).toLocaleString();

function App() {
  const [data, setData] = useState(null);
  const [connection, setConnection] = useState('Connecting');
  useEffect(() => {
    let active = true;
    const stream = new EventSource('./api/events');
    stream.addEventListener('snapshot', (event) => {
      if (active) { setData(JSON.parse(event.data)); setConnection('Live'); }
    });
    stream.onerror = () => { if (active) setConnection('Reconnecting'); };
    return () => { active = false; stream.close(); };
  }, []);
  return <main>
    <header><div><p className="eyebrow">PI / OBSERVABILITY</p><h1>Token usage</h1><p className="subtitle">Live session activity · {data?.model ?? 'Waiting for model'}</p></div><span role="status" className={`connection ${connection.toLowerCase()}`}><span className="dot"/>{connection}</span></header>
    <section className="counters" aria-label="Token counters">{fields.map(([key, label]) => <article key={key}><div className="counter-label">{label}</div><strong data-counter={key}>{format(data?.totals[key])}</strong></article>)}</section>
    <section className="activity"><div className="section-title"><h2>Activity timeline</h2><span>Last 200 events</span></div>
      <div className="table-wrap"><table><thead><tr><th>Event</th><th>Started</th><th>Ended</th><th>Duration</th><th>Status</th><th>Message tokens</th></tr></thead><tbody>
        {data?.activities.length ? data.activities.map((item) => <tr key={item.id} data-activity={item.kind}><td><span className="kind">{item.kind}</span><span className="label">{item.label}</span></td><td>{time(item.start)}</td><td>{time(item.end)}</td><td>{item.duration == null ? '—' : `${(item.duration / 1000).toFixed(2)}s`}</td><td><span className={`badge ${item.status}`}>{item.status}</span></td><td>{item.usage ? <div className="message-usage"><strong>Pi total {format(item.usage.totalTokens)}</strong><small>In {format(item.usage.input)} · Out {format(item.usage.output)} · Cache read {format(item.usage.cacheRead)} · Cache write {format(item.usage.cacheWrite)}</small></div> : '—'}</td></tr>) : <tr><td colSpan="6" className="empty">No activity yet. Start an agent run in Pi.</td></tr>}
      </tbody></table></div>
    </section><footer>Usage comes from completed assistant messages. Pi total is reported by Pi, not recomputed.</footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
