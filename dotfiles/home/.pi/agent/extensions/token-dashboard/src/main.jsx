import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const labels = { input: 'Input', output: 'Output', cacheRead: 'Cache read', cacheWrite: 'Cache write', totalTokens: 'Pi reported total' };
const formatTime = time => time == null ? '—' : new Date(time).toLocaleTimeString();

export function App() {
  const [state, setState] = useState(null);
  const [connection, setConnection] = useState('Connecting');
  useEffect(() => {
    // Browser-native EventSource retries automatically after interruptions and carries credentials for same-origin requests.
    const source = new EventSource('./events');
    const onSnapshot = event => { setState(JSON.parse(event.data)); setConnection('Live'); };
    source.addEventListener('snapshot', onSnapshot);
    source.onerror = () => setConnection('Reconnecting');
    return () => { source.removeEventListener('snapshot', onSnapshot); source.close(); };
  }, []);
  return <main>
    <header><div><h1>Pi token dashboard</h1><p>Live session activity · {state?.model ?? 'No completed assistant message yet'}</p></div><span role="status" className={'connection ' + connection.toLowerCase()}>{connection}</span></header>
    <section className="counters" aria-label="Token counters">{Object.entries(labels).map(([key, label]) => <article key={key}><small>{label}</small><strong>{(state?.totals[key] ?? 0).toLocaleString()}</strong></article>)}</section>
    <section><h2>Activity timeline</h2><p className="hint">Most recent first · showing up to 200 activities</p><div className="feed" aria-live="polite">{!state?.activity.length ? <p>No activity yet. Start a Pi run to see events here.</p> : state.activity.map(item => <article className="activity" key={item.id}>
      <div className="activity-head"><strong>{item.kind === 'tool' ? `Tool · ${item.name}` : item.kind === 'assistant' ? `Assistant · ${item.name}` : item.kind === 'turn' ? item.name : 'Agent run'}</strong><span className={'status ' + item.status}>{item.status}</span></div>
      <div className="details">{formatTime(item.start)} → {formatTime(item.end)} · {item.duration == null ? '—' : `${item.duration} ms`}</div>
      {item.usage && <div className="details">{Object.entries(labels).map(([key, label]) => `${label}: ${item.usage[key].toLocaleString()}`).join(' · ')}</div>}
    </article>)}</div></section>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
