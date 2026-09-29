import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowLeft, ArrowRight, Box, ChevronRight, CircleHelp, Clock3, Code2, Command, Container, File, Folder, HardDrive, Layers3, ListFilter, RefreshCw, Send, Terminal, Workflow } from 'lucide-react';
import './styles.css';

async function api(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

const sections = [
  { id: 'files', label: 'File Browser', icon: Folder },
  { id: 'docker', label: 'Docker Browser', icon: Container },
  { id: 'tasks', label: 'Codex Task Dispatcher', icon: Workflow }
];

function Badge({ children, tone = 'neutral' }) { return <span className={`badge ${tone}`}>{children}</span>; }

function Header({ section, detail, onRefresh }) {
  return <header className="topbar"><div className="topbar-title"><span className="eyebrow">WORKSPACE / CONTROL PLANE</span><div className="topbar-heading"><h1>{section}</h1><span className="header-divider"/><span>{detail}</span></div></div><div className="topbar-actions"><span className="connection"><span className="live-dot"/> Local connection</span><button className="icon-button" aria-label="Refresh" onClick={onRefresh}><RefreshCw size={16}/></button></div></header>;
}

function Sidebar({ active, setActive }) {
  return <aside className="sidebar"><div className="brand"><div className="brand-mark"><Layers3 size={22} strokeWidth={2.3}/></div><div><strong>Control Plane</strong><span>LOCAL OPERATIONS</span></div></div><div className="sidebar-section-label">WORKSPACE</div><nav aria-label="Main navigation">{sections.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => setActive(id)}><Icon size={18}/><span>{label}</span>{active === id && <span className="nav-indicator"/>}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-help"><CircleHelp size={17}/><span>Local tools dashboard</span></div><div className="machine-card"><div className="machine-icon"><HardDrive size={18}/></div><div><strong>This machine</strong><span>Connected locally</span></div><span className="machine-dot"/></div></div></aside>;
}

function Files() {
  const [location, setLocation] = useState('/');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { let live = true; setLoading(true); api(`/api/files?path=${encodeURIComponent(location)}`).then(value => { if (live) { setData(value); setError(''); setLoading(false); } }).catch(err => { if (live) { setError(err.message); setLoading(false); } }); return () => { live = false; }; }, [location, refresh]);
  const parts = data?.path.split('/').filter(Boolean) || [];
  return <><Header section="File Browser" detail="Explore the filesystem" onRefresh={() => setRefresh(x => x + 1)}/><div className="page-content"><div className="page-intro"><div><div className="section-kicker"><Folder size={14}/> FILE SYSTEM</div><h2>Browse files and folders</h2><p>Navigate the directories on this machine. File contents are never opened here.</p></div><div className="intro-icon"><Folder size={27}/></div></div><div className="content-card"><div className="card-toolbar"><div className="breadcrumb"><button onClick={() => setLocation('/')} aria-label="Root directory"><HardDrive size={16}/></button><ChevronRight size={15}/>{parts.map((part, index) => <React.Fragment key={`${part}-${index}`}><button onClick={() => setLocation('/' + parts.slice(0, index + 1).join('/'))}>{part}</button>{index < parts.length - 1 && <ChevronRight size={15}/>}</React.Fragment>)}</div><Badge>{data?.entries.length ?? 0} items</Badge></div><div className="path-strip"><span>LOCATION</span><code>{data?.path || location}</code></div>{error ? <div className="message error">{error}</div> : loading ? <div className="message">Loading directory…</div> : <><div className="file-head"><span>NAME</span><span>TYPE</span><span/></div><div className="file-list">{data.parent && <button className="file-row" onClick={() => setLocation(data.parent)}><span className="file-name"><span className="file-icon up"><ArrowLeft size={17}/></span>.. <small>Parent directory</small></span><span className="type-text">Directory</span><ArrowRight size={16}/></button>}{data.entries.map(entry => <button className="file-row" key={entry.name} disabled={entry.type !== 'directory'} onClick={() => setLocation(data.path === '/' ? '/' + entry.name : `${data.path}/${entry.name}`)}><span className="file-name"><span className={`file-icon ${entry.type}`} >{entry.type === 'directory' ? <Folder size={18}/> : <File size={17}/>}</span>{entry.name}</span><span className="type-text">{entry.type === 'directory' ? 'Directory' : entry.type === 'symlink' ? 'Symbolic link' : 'File'}</span>{entry.type === 'directory' ? <ChevronRight size={17}/> : <span/>}</button>)}{data.entries.length === 0 && <div className="message">This directory is empty.</div>}</div></>}</div><div className="footnote"><CircleHelp size={15}/> Read-only browsing · Select a folder to open it</div></div></>;
}

function Docker() {
  const [containers, setContainers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { let live = true; api('/api/docker/containers').then(({ containers: rows }) => { if (live) { setContainers(rows); setError(''); setSelected(current => rows.find(row => row.id === current?.id) || rows[0] || null); } }).catch(err => live && setError(err.message)); return () => { live = false; }; }, [refresh]);
  useEffect(() => { if (!selected) return; let live = true; setLogs('Loading logs…'); api(`/api/docker/containers/${encodeURIComponent(selected.id)}/logs`).then(result => live && setLogs(result.logs || 'No logs available for this container.')).catch(err => live && setLogs(err.message)); return () => { live = false; }; }, [selected, refresh]);
  return <><Header section="Docker Browser" detail="Containers and logs" onRefresh={() => setRefresh(x => x + 1)}/><div className="page-content"><div className="page-intro"><div><div className="section-kicker"><Container size={14}/> CONTAINERS</div><h2>Docker overview</h2><p>Inspect your local containers and read their latest log output.</p></div><div className="intro-icon"><Container size={28}/></div></div><div className="stat-row"><div className="stat-card"><span>TOTAL CONTAINERS</span><strong>{containers.length}</strong><Box size={21}/></div><div className="stat-card"><span>RUNNING</span><strong>{containers.filter(c => c.state?.toLowerCase() === 'running').length}</strong><Activity size={21}/></div><div className="stat-card"><span>STOPPED</span><strong>{containers.filter(c => c.state?.toLowerCase() !== 'running').length}</strong><Clock3 size={21}/></div></div>{error && <div className="message error">{error}</div>}<div className="docker-grid"><div className="content-card container-panel"><div className="panel-heading"><div><h3>Containers</h3><span>All local containers</span></div><ListFilter size={18}/></div>{containers.length ? containers.map(container => <button key={container.id} className={`container-row ${selected?.id === container.id ? 'selected' : ''}`} onClick={() => setSelected(container)}><span className="container-symbol"><Container size={20}/></span><span className="container-info"><strong>{container.name}</strong><small>{container.image}</small><span className="container-id">{container.id.slice(0, 12)}</span></span><Badge tone={container.state?.toLowerCase() === 'running' ? 'success' : 'neutral'}>{container.state || 'unknown'}</Badge></button>) : <div className="message">No containers found.</div>}</div><div className="content-card logs-panel"><div className="panel-heading"><div><h3>Container logs</h3><span>{selected ? selected.name : 'Select a container'}</span></div><Terminal size={18}/></div><div className="log-meta"><span className="live-dot"/> Latest 200 lines <span className="log-id">{selected?.id.slice(0, 12) || '—'}</span></div><pre className="log-output">{selected ? logs : 'Select a container to view its logs.'}</pre></div></div><div className="footnote"><CircleHelp size={15}/> Logs show the latest 200 lines with timestamps</div></div></>;
}

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { let live = true; api('/api/tasks').then(({ tasks: rows }) => { if (live) { setTasks(rows); setSelectedId(current => current || rows[0]?.id); } }).catch(err => live && setError(err.message)); return () => { live = false; }; }, [refresh]);
  useEffect(() => { const streams = tasks.filter(t => t.status === 'running').map(task => { const source = new EventSource(`/api/tasks/${task.id}/events`); source.onmessage = event => { const value = JSON.parse(event.data); setTasks(current => current.map(row => row.id === value.id ? value : row)); if (value.status !== 'running') source.close(); }; return source; }); return () => streams.forEach(source => source.close()); }, [tasks.map(t => `${t.id}:${t.status}`).join('|')]);
  async function dispatch(event) { event.preventDefault(); if (!prompt.trim()) return; try { const task = await api('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) }); setTasks(current => [task, ...current]); setSelectedId(task.id); setPrompt(''); setError(''); } catch (err) { setError(err.message); } }
  const selected = tasks.find(t => t.id === selectedId);
  return <><Header section="Codex Task Dispatcher" detail="Run single-prompt tasks" onRefresh={() => setRefresh(x => x + 1)}/><div className="page-content"><div className="page-intro"><div><div className="section-kicker"><Workflow size={14}/> CODEX AUTOMATION</div><h2>Dispatch a task</h2><p>Send one prompt to Codex and follow its response as it runs.</p></div><div className="intro-icon"><Code2 size={29}/></div></div><div className="task-grid"><div className="task-main"><form className="content-card composer" onSubmit={dispatch}><div className="panel-heading"><div><h3>New task</h3><span>What would you like Codex to do?</span></div><Command size={18}/></div><label htmlFor="prompt">YOUR PROMPT</label><textarea id="prompt" placeholder="Describe a task for Codex to work on..." value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={10000}/><div className="composer-bottom"><span>One prompt per task · Runs locally</span><button className="primary-button" disabled={!prompt.trim()}><Send size={16}/> Dispatch task</button></div></form>{error && <div className="message error">{error}</div>}<div className="content-card output-panel"><div className="panel-heading"><div><h3>Task output</h3><span>{selected ? `Task ${selected.id.slice(0, 8)}` : 'Select a task to view its output'}</span></div>{selected && <Badge tone={selected.status === 'completed' ? 'success' : selected.status === 'failed' ? 'danger' : 'running'}>{selected.status}</Badge>}</div><pre className="task-output">{selected?.output || (selected?.status === 'running' ? 'Waiting for Codex output…' : 'Task output will appear here.')}</pre></div></div><div className="content-card history-panel"><div className="panel-heading"><div><h3>Recent tasks</h3><span>{tasks.length} dispatched</span></div><Clock3 size={18}/></div>{tasks.length ? tasks.map(task => <button className={`history-row ${selectedId === task.id ? 'selected' : ''}`} key={task.id} onClick={() => setSelectedId(task.id)}><span className="history-icon"><Command size={17}/></span><span><strong>{task.prompt}</strong><small>{new Date(task.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })} UTC</small></span><Badge tone={task.status === 'completed' ? 'success' : task.status === 'failed' ? 'danger' : 'running'}>{task.status}</Badge></button>) : <div className="empty-history"><Workflow size={25}/><strong>No tasks yet</strong><span>Dispatch your first task to see it here.</span></div>}</div></div><div className="footnote"><CircleHelp size={15}/> Output streams live while Codex is running</div></div></>;
}

function App() { const [active, setActive] = useState('files'); return <div className="app"><Sidebar active={active} setActive={setActive}/><main className="main">{active === 'files' ? <Files/> : active === 'docker' ? <Docker/> : <Tasks/>}</main></div>; }

createRoot(document.getElementById('root')).render(<App/>);
