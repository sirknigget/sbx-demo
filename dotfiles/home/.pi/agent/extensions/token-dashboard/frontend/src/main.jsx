import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

export function App() {
  const [state, setState] = useState(null);
  const [connection, setConnection] = useState('Connecting');
  useEffect(() => {
    const stream = new EventSource('/api/events');
    stream.addEventListener('state', event => { setState(JSON.parse(event.data)); setConnection('Live'); });
    stream.onerror = () => setConnection('Reconnecting');
    return () => stream.close();
  }, []);
  const total = state?.total ?? {};
  const format = n => (n ?? 0).toLocaleString();
  return <main>
    <header><div><h1>Pi token dashboard</h1><p>Live agent activity and completed-message usage</p></div><span role="status" className={connection === 'Live' ? 'live' : 'offline'}>{connection}</span></header>
    <section className="summary"><div className="model">Model <strong>{state?.model || 'Not selected'}</strong></div><div>Messages <strong>{format(state?.messages)}</strong></div></section>
    <section className="counters" aria-label="Token counters">{[['input','Input'], ['output','Output'], ['cacheRead','Cache read'], ['cacheWrite','Cache write'], ['totalTokens','Pi total']].map(([key, label]) => <div className="counter" key={key}><span>{label}</span><strong>{format(total[key])}</strong></div>)}</section>
    <h2>Activity <small>Latest 200</small></h2>
    <section className="feed" aria-label="Activity timeline">{!state?.activity?.length && <p>Waiting for activity…</p>}{[...(state?.activity ?? [])].reverse().map(item => <article key={item.id} className="item"><div className="item-head"><strong>{item.kind === 'tool' ? `Tool · ${item.name}` : item.kind === 'message' ? 'Assistant message' : item.name}</strong><span className={item.status}>{item.status}</span></div><div className="meta">{new Date(item.start).toLocaleString()} → {item.end ? new Date(item.end).toLocaleString() : 'running'} · {item.durationMs == null ? '…' : `${item.durationMs} ms`}</div>{item.model && <div className="meta">{item.model}</div>}{item.usage && <div className="usage">Input {format(item.usage.input)} · Output {format(item.usage.output)} · Cache read {format(item.usage.cacheRead)} · Cache write {format(item.usage.cacheWrite)} · Pi total {format(item.usage.totalTokens)}</div>}</article>)}</section>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
