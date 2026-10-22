import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [state, setState] = useState({ model: null, totals: {}, activity: [] });
  const [connection, setConnection] = useState('Connecting…');
  useEffect(() => {
    let source;
    let stopped = false;
    let retry;
    const connect = () => {
      if (stopped) return;
      source = new EventSource('./api/events');
      source.onopen = () => setConnection('Connected');
      source.onmessage = event => setState(JSON.parse(event.data));
      source.onerror = () => {
        setConnection('Disconnected · reconnecting…');
        source.close();
        retry = setTimeout(connect, 1500);
      };
    };
    fetch('./api/snapshot').then(response => response.json()).then(data => { if (!stopped) setState(data); }).catch(() => {});
    connect();
    return () => { stopped = true; clearTimeout(retry); source?.close(); };
  }, []);
  const label = { input: 'Input', output: 'Output', cacheRead: 'Cache read', cacheWrite: 'Cache write', totalTokens: 'Pi total' };
  return <main><header><h1>Pi token dashboard</h1><span role="status" className={connection === 'Connected' ? 'connected' : 'disconnected'}>{connection}</span></header>
    <p>Current model: <strong>{state.model ?? 'Not selected'}</strong></p>
    <section className="counters" aria-label="Token totals">{Object.entries(label).map(([key, title]) => <div key={key}><span>{title}</span><strong>{(state.totals[key] ?? 0).toLocaleString()}</strong></div>)}</section>
    <h2>Activity</h2><ol aria-label="Activity timeline">{[...state.activity].reverse().map(item => <li key={item.id}>
      <span className="time">{new Date(item.start).toLocaleTimeString()}</span>
      <strong>{item.name}</strong> <span>{item.kind} · {item.phase}</span>
      {item.end && <span> → {new Date(item.end).toLocaleTimeString()}</span>}
      {item.duration !== undefined && <span> · {item.duration} ms</span>}
      {item.status && <span className={item.status === 'error' ? 'error' : 'ok'}> · {item.status}</span>}
      {item.usage && <span> · {Object.entries(label).map(([key, title]) => `${title}: ${item.usage[key]}`).join(' · ')}</span>}
    </li>)}</ol>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
