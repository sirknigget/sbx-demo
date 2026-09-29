import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

async function getJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

const sections = [
  { id: 'files', label: 'File Browser', icon: '▤', detail: 'Explore the machine' },
  { id: 'docker', label: 'Docker Browser', icon: '▣', detail: 'Containers and logs' },
  { id: 'tasks', label: 'Codex Task Dispatcher', icon: '⌘', detail: 'Run a prompt' },
];

function App() {
  const [section, setSection] = useState('files');
  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">◈</span><div><strong>Control Plane</strong><small>LOCAL WORKSPACE</small></div></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav aria-label="Main navigation">{sections.map(item => <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} onClick={() => setSection(item.id)}><span className="nav-icon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.detail}</small></span><span className="chevron">›</span></button>)}</nav>
      <div className="sidebar-bottom"><span className="online-dot"/> Connected to this machine</div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> {sections.find(s => s.id === section).label}</div><div className="local-pill"><span className="online-dot"/> LOCAL INSTANCE</div></header>
      <div className="content">{section === 'files' ? <Files/> : section === 'docker' ? <Docker/> : <Tasks/>}</div>
    </main>
  </div>;
}

function Heading({ eyebrow, title, description, action }) { return <div className="heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
function Notice({ message }) { return message ? <div className="notice" role="alert">{message}</div> : null; }
function Empty({ title, text }) { return <div className="empty"><div className="empty-icon">◇</div><strong>{title}</strong><p>{text}</p></div>; }

function Files() {
  const [directory, setDirectory] = useState('');
  const [input, setInput] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { let cancelled = false; setLoading(true); setError(''); getJson('/api/files' + (directory ? `?path=${encodeURIComponent(directory)}` : '')).then(d => { if (!cancelled) { setData(d); setInput(d.path); } }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [directory]);
  const parts = data?.path.split('/').filter(Boolean) || [];
  return <><Heading eyebrow="01 / FILE SYSTEM" title="File Browser" description="Explore folders and files on this machine. Files are listed only; their contents stay private."/><div className="card"><div className="card-head"><div><strong>Directory</strong><small>Navigate using the path or select a folder below</small></div><span className="tag">READ ONLY</span></div><form className="path-form" onSubmit={e => { e.preventDefault(); setDirectory(input); }}><span className="path-icon">⌁</span><input aria-label="Directory path" value={input} onChange={e => setInput(e.target.value)} placeholder="Enter an absolute path"/><button type="submit">Go to path <span>→</span></button></form><div className="breadcrumbs"><button onClick={() => setDirectory('/')}>root</button>{parts.map((part, i) => <React.Fragment key={i}><span>/</span><button onClick={() => setDirectory('/' + parts.slice(0, i + 1).join('/'))}>{part}</button></React.Fragment>)}</div><Notice message={error}/><div className="list-head"><span>NAME</span><span>TYPE</span></div><div className="file-list">{data?.parent && <button className="file-row" onClick={() => setDirectory(data.parent)}><span className="file-name"><span className="file-icon folder">↰</span>..</span><span className="file-type">PARENT</span></button>}{data?.entries.map(entry => <button className="file-row" key={entry.path} disabled={entry.type !== 'directory'} onClick={() => setDirectory(entry.path)}><span className="file-name"><span className={`file-icon ${entry.type}`}>{entry.type === 'directory' ? '▰' : '▤'}</span>{entry.name}</span><span className="file-type">{entry.type.toUpperCase()}</span></button>)}{loading && <div className="inline-state">Loading directory…</div>}{!loading && data?.entries.length === 0 && <Empty title="Empty directory" text="There are no entries here."/>}</div></div></>;
}

function Docker() {
  const [containers, setContainers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');
  const [logError, setLogError] = useState('');
  const logRef = useRef(null);
  const refresh = () => getJson('/api/docker/containers').then(d => { setContainers(d.containers); setError(''); }).catch(e => setError(e.message));
  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (!selected) return; let cancelled = false; const poll = () => getJson(`/api/docker/containers/${encodeURIComponent(selected.id)}/logs`).then(d => { if (!cancelled) { setLogs(d.logs); setLogError(''); } }).catch(e => { if (!cancelled) setLogError(e.message); }); setLogs(''); poll(); const timer = setInterval(poll, 1000); return () => { cancelled = true; clearInterval(timer); }; }, [selected?.id]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);
  return <><Heading eyebrow="02 / RUNTIME" title="Docker Browser" description="Inspect containers and follow their latest log output." action={<button className="secondary-button" onClick={refresh}>↻ &nbsp; Refresh containers</button>}/><Notice message={error}/><div className="split"><div className="card containers"><div className="card-head"><div><strong>Containers</strong><small>{containers.length} found on this machine</small></div><span className="count">{containers.length}</span></div><div className="container-list">{containers.map(c => <button key={c.id} className={`container-row ${selected?.id === c.id ? 'selected' : ''}`} onClick={() => setSelected(c)}><span className="container-symbol">⬡</span><span className="container-info"><strong>{c.name}</strong><small>{c.image}</small><span className="container-id">{c.id}</span></span><span className={`status ${c.state === 'running' ? 'running' : ''}`}>{c.state}</span></button>)}{!containers.length && !error && <Empty title="No containers" text="Docker containers will appear here."/>}</div></div><div className="card logs"><div className="card-head"><div><strong>Container logs</strong><small>{selected ? selected.name : 'Select a container to view logs'}</small></div>{selected && <span className="live"><span className="online-dot"/> LIVE · 1S</span>}</div>{selected ? <><Notice message={logError}/><pre ref={logRef} className="log-output" aria-label="Container logs">{logs || 'Waiting for log output…'}</pre></> : <Empty title="Select a container" text="Choose a container on the left to see its latest logs."/>}</div></div></>;
}

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [cwd, setCwd] = useState('');
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState('');
  const outputRef = useRef(null);
  const selected = tasks.find(t => t.id === selectedId);
  useEffect(() => { getJson('/api/tasks').then(d => { setTasks(d.tasks); if (d.tasks.length) setSelectedId(d.tasks[0].id); }).catch(e => setError(e.message)); getJson('/api/files').then(d => setCwd(d.path)).catch(() => {}); }, []);
  useEffect(() => { if (!selectedId) return; const source = new EventSource(`/api/tasks/${selectedId}/events`); source.onmessage = e => { const task = JSON.parse(e.data); setTasks(current => current.map(t => t.id === task.id ? task : t)); if (task.status !== 'running') source.close(); }; return () => source.close(); }, [selectedId]);
  useEffect(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight; }, [selected?.output]);
  async function submit(e) { e.preventDefault(); setError(''); try { const task = await getJson('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, cwd }) }); setTasks(current => [task, ...current]); setSelectedId(task.id); setPrompt(''); } catch (err) { setError(err.message); } }
  return <><Heading eyebrow="03 / AUTOMATION" title="Codex Task Dispatcher" description="Send one prompt to Codex and watch its response as it runs."/><div className="task-grid"><div className="card dispatch"><div className="card-head"><div><strong>New task</strong><small>Configure a working directory and prompt</small></div><span className="tag">CODEX CLI</span></div><form onSubmit={submit}><label htmlFor="cwd">WORKING DIRECTORY</label><div className="cwd-input"><input id="cwd" value={cwd} onChange={e => setCwd(e.target.value)} placeholder="/absolute/path" required/><button type="button" onClick={() => setPicker(true)} aria-label="Browse directories">Browse</button></div><label htmlFor="prompt">PROMPT</label><textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the task you want Codex to complete…" rows="7" required/><Notice message={error}/><button className="primary-button" type="submit">Dispatch task <span>→</span></button></form></div><div className="card task-panel"><div className="card-head"><div><strong>Task activity</strong><small>Live text output from Codex</small></div>{selected && <span className={`status ${selected.status}`}>{selected.status}</span>}</div>{tasks.length > 0 && <div className="task-tabs">{tasks.map(t => <button key={t.id} className={selectedId === t.id ? 'selected' : ''} onClick={() => setSelectedId(t.id)}>{t.prompt.length > 28 ? t.prompt.slice(0, 28) + '…' : t.prompt}</button>)}</div>}{selected ? <><div className="task-meta"><span>WORKING IN</span> {selected.cwd}</div><pre className="task-output" ref={outputRef} aria-label="Task output">{selected.output || (selected.status === 'running' ? 'Waiting for Codex output…' : 'No output.')}</pre></> : <Empty title="No tasks yet" text="Your dispatched tasks and their live output will appear here."/>}</div></div>{picker && <DirectoryPicker initial={cwd} onClose={() => setPicker(false)} onChoose={value => { setCwd(value); setPicker(false); }}/>}</>;
}

function DirectoryPicker({ initial, onClose, onChoose }) {
  const [directory, setDirectory] = useState(initial || '/');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getJson(`/api/files?path=${encodeURIComponent(directory)}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message)); }, [directory]);
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal card" role="dialog" aria-modal="true" aria-label="Choose working directory" onMouseDown={e => e.stopPropagation()}><div className="card-head"><div><strong>Choose working directory</strong><small>{data?.path || directory}</small></div><button className="close" onClick={onClose} aria-label="Close">×</button></div><Notice message={error}/><div className="picker-list">{data?.parent && <button onClick={() => setDirectory(data.parent)}>↰ &nbsp; ..</button>}{data?.entries.filter(e => e.type === 'directory').map(e => <button key={e.path} onClick={() => setDirectory(e.path)}>▰ &nbsp; {e.name}</button>)}</div><button className="primary-button" onClick={() => onChoose(data?.path || directory)}>Use this directory <span>→</span></button></div></div>;
}

createRoot(document.getElementById('root')).render(<App/>);
