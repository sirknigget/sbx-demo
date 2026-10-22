import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const fields = [['input', 'Input'], ['output', 'Output'], ['cacheRead', 'Cache read'], ['cacheWrite', 'Cache write'], ['totalTokens', 'Pi total']];
const number = value => (value ?? 0).toLocaleString();
const clock = value => value == null ? '—' : new Date(value).toLocaleTimeString();

function App() {
  const [state, setState] = useState({ model: 'Unknown', totals: {}, history: [] });
  const [connection, setConnection] = useState('Connecting');
  useEffect(() => {
    let mounted = true;
    let source;
    // EventSource automatically reconnects after interruption.
    const connect = () => {
      if (!mounted) return;
      source = new EventSource('./api/events');
      source.addEventListener('snapshot', event => { if (mounted) { setState(JSON.parse(event.data)); setConnection('Live'); } });
      source.onerror = () => { if (mounted) setConnection('Reconnecting'); };
    };
    connect();
    return () => { mounted = false; source?.close(); };
  }, []);
  return <main>
    <header><div><p className="eyebrow">PI / LIVE TELEMETRY</p><h1>Token usage</h1><p className="sub">Model <strong data-testid="model">{state.model}</strong> · {number(state.totals.messages)} completed messages</p></div><span className={`indicator ${connection.toLowerCase()}`} role="status"><i />{connection}</span></header>
    <section className="counters" aria-label="Token counters">{fields.map(([key, label]) => <article key={key}><span>{label}</span><strong data-testid={key}>{number(state.totals[key])}</strong><small>tokens</small></article>)}</section>
    <section className="activity"><div className="section-heading"><div><p className="eyebrow">EVENT LOG</p><h2>Activity timeline</h2></div><span>Latest {state.history.length} events</span></div>
      {state.history.length === 0 ? <p className="empty">Waiting for agent activity…</p> : <div className="feed" role="log">{[...state.history].reverse().map(item => <div className="event" key={item.id}><span className={`tag ${item.kind}`}>{item.kind}</span><div className="event-body"><strong>{item.name}</strong><span>{clock(item.start)} → {clock(item.end)} · {item.duration == null ? 'running' : `${item.duration} ms`}{item.usage && ` · ${fields.map(([key, label]) => `${label}: ${number(item.usage[key])}`).join(' · ')}`}</span></div><span className={`status ${item.status}`}>{item.phase === 'start' ? 'started' : item.status}</span></div>)}</div>}
    </section><footer>Pi dashboard · Live session data only · Last 200 events</footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
