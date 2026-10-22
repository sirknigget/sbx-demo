import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const style = document.createElement('style');
style.textContent = `:root{font-family:system-ui,sans-serif;color:#e9edf5;background:#101723;color-scheme:dark}body{max-width:1000px;margin:0 auto;padding:2rem}header{display:flex;align-items:center;justify-content:space-between;gap:1rem}h1{margin:0}h2{margin-top:2rem}.status{border-radius:1rem;padding:.45rem .9rem;background:#513525}.online{background:#174c38}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:1rem;margin-top:2rem}.card,.item{background:#1c2737;border:1px solid #334359;border-radius:10px;padding:1rem}.card strong{display:block;font-size:1.7rem;margin-top:.5rem}.muted{color:#aab9cb}.feed{list-style:none;padding:0}.item{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin:.6rem 0}.item small{display:block;color:#aab9cb;margin-top:.35rem}.error{color:#ff9e9e}.success{color:#91e3b5}.running{color:#ffd48a}@media(max-width:550px){body{padding:1rem}.item{display:block}}`;
document.head.append(style);
const fields = [['input', 'Input'], ['output', 'Output'], ['cacheRead', 'Cache read'], ['cacheWrite', 'Cache write'], ['totalTokens', 'Pi reported total']];
const format = value => new Intl.NumberFormat().format(value || 0);
const time = value => value ? new Date(value).toLocaleTimeString() : '…';

function App() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const stream = new EventSource('./api/events');
    stream.addEventListener('snapshot', event => { setState(JSON.parse(event.data)); setConnected(true); });
    stream.onerror = () => setConnected(false);
    return () => stream.close();
  }, []);
  return <><header><div><h1>Pi token dashboard</h1><p className="muted">Current model: {state?.model || 'No model selected'}</p></div><span role="status" className={`status ${connected ? 'online' : ''}`}>{connected ? '● Live' : '○ Reconnecting…'}</span></header>
    <section className="cards" aria-label="Token totals">{fields.map(([key, label]) => <div className="card" key={key}>{label}<strong data-token={key}>{format(state?.usage[key])}</strong></div>)}</section>
    <p className="muted">{format(state?.messages)} completed assistant messages · Totals use Pi's reported usage; cache and reasoning are not added twice.</p>
    <h2>Activity</h2><ol className="feed">{state?.activity.map(item => <li className="item" key={item.id}><div><b>{item.label}</b><small>{time(item.start)} → {time(item.end)} · {item.duration == null ? 'in progress' : `${format(item.duration)} ms`}{item.usage && ` · ${format(item.usage.totalTokens)} tokens`}</small></div><span className={item.status}>{item.status}</span></li>)}</ol>
    {!state?.activity.length && <p className="muted">Waiting for agent activity…</p>}</>;
}
createRoot(document.getElementById('root')).render(<App />);
