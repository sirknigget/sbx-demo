import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Box,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Code2,
  File,
  Folder,
  FolderOpen,
  HardDrive,
  Layers,
  Play,
  RefreshCw,
  Search,
  Terminal,
  X,
} from "lucide-react";
import "./style.css";

async function api(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
const formatSize = (size) =>
  size == null
    ? "—"
    : size < 1024
      ? `${size} B`
      : size < 1024 * 1024
        ? `${(size / 1024).toFixed(1)} KB`
        : `${(size / 1024 / 1024).toFixed(1)} MB`;
const formatDate = (date) =>
  date
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(date))
    : "—";
function ErrorMessage({ error }) {
  return error ? (
    <div className="error" role="alert">
      {error}
    </div>
  ) : null;
}
function Badge({ status }) {
  return (
    <span className={`badge ${status}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}
function Empty({ icon: Icon = FolderOpen, title, children }) {
  return (
    <div className="empty">
      <Icon size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function PathBar({ path, onNavigate }) {
  const segments = path.split("/").filter(Boolean);
  return (
    <div className="path-bar">
      <HardDrive size={16} />
      <button onClick={() => onNavigate("/")}>Root</button>
      {segments.map((part, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={13} />
          <button
            onClick={() => onNavigate("/" + segments.slice(0, i + 1).join("/"))}
          >
            {part}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

function DirectoryBrowser({ initialPath, onSelect, compact = false }) {
  const [path, setPath] = useState(initialPath);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    api(`/api/files?path=${encodeURIComponent(path)}`, {
      signal: controller.signal,
    })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, revision]);
  const navigate = (next) => {
    setPath(next);
    setQuery("");
  };
  const entries = (data?.entries || []).filter(
    (entry) =>
      (!compact || entry.type === "directory") &&
      entry.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="browser-panel panel">
      <div className="browser-toolbar">
        <PathBar path={data?.path || path} onNavigate={navigate} />
        <div className="toolbar-actions">
          <button
            className="icon-button"
            title="Parent directory"
            aria-label="Parent directory"
            disabled={path === "/"}
            onClick={() =>
              navigate(
                data?.parent || path.substring(0, path.lastIndexOf("/")) || "/",
              )
            }
          >
            <ArrowUp size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Refresh directory"
            onClick={() => setRevision((n) => n + 1)}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      <div className="table-top">
        <span className="muted">
          {compact ? "Choose a working directory" : "Directory contents"}
        </span>
        <label className="search">
          <Search size={15} />
          <input
            aria-label="Filter files"
            placeholder={
              compact ? "Filter folders…" : "Filter files and folders…"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <ErrorMessage error={error} />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              {!compact && (
                <>
                  <th>Size</th>
                  <th>Modified (UTC)</th>
                </>
              )}
              <th className="arrow-cell" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.path}>
                <td>
                  {entry.type === "directory" ? (
                    <button
                      className="entry-name"
                      onClick={() => navigate(entry.path)}
                    >
                      <Folder size={19} className="folder-icon" />
                      {entry.name}
                    </button>
                  ) : (
                    <span className="entry-name">
                      <File size={19} className="file-icon" />
                      {entry.name}
                    </span>
                  )}
                </td>
                <td className="muted">
                  {entry.type === "directory"
                    ? "Folder"
                    : entry.type === "link"
                      ? "Symbolic link"
                      : "File"}
                </td>
                {!compact && (
                  <>
                    <td className="mono muted">{formatSize(entry.size)}</td>
                    <td className="muted">{formatDate(entry.modified)}</td>
                  </>
                )}
                <td>
                  {entry.type === "directory" && (
                    <ChevronRight size={15} className="muted" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading ? (
        <div className="loading" role="status">
          Loading directory…
        </div>
      ) : (
        !error &&
        entries.length === 0 && (
          <Empty title="No entries found">
            {query ? "Try a different filter." : "This directory is empty."}
          </Empty>
        )
      )}
      <div className="panel-footer">
        <span>
          {entries.length} {compact ? "folders" : "items"}
          <span className="footer-divider">/</span>
          {compact ? "Directories only" : "Read-only access"}
        </span>
        {onSelect ? (
          <button
            className="primary small"
            disabled={!data || loading || Boolean(error)}
            onClick={() => onSelect(data.path)}
          >
            <Check size={15} />
            Use this directory
          </button>
        ) : (
          <span className="muted">
            <Circle size={10} /> Local filesystem
          </span>
        )}
      </div>
    </div>
  );
}

function DockerBrowser() {
  const [containers, setContainers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [logs, setLogs] = useState("");
  const [error, setError] = useState("");
  const [logError, setLogError] = useState("");
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [filter, setFilter] = useState("");
  const [follow, setFollow] = useState(true);
  const logRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api("/api/containers", { signal: controller.signal })
      .then((data) => {
        setContainers(data.containers);
        setSelected((current) =>
          current
            ? data.containers.find((item) => item.id === current.id) || null
            : null,
        );
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    let timer;
    setLogs("");
    setLogError("");
    setLogLoading(true);
    const poll = async () => {
      try {
        const data = await api(`/api/containers/${selected.id}/logs`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setLogs(data.output);
          setLogError("");
        }
      } catch (e) {
        if (e.name !== "AbortError") setLogError(e.message);
      } finally {
        if (!controller.signal.aborted) {
          setLogLoading(false);
          timer = setTimeout(poll, 1000);
        }
      }
    };
    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [selected?.id]);
  useEffect(() => {
    if (follow && logRef.current)
      logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs, follow]);
  const visible = containers.filter((c) =>
    `${c.name} ${c.image}`.toLowerCase().includes(filter.toLowerCase()),
  );
  if (selected)
    return (
      <>
        <button className="back-link" onClick={() => setSelected(null)}>
          <ArrowLeft size={15} />
          All containers
        </button>
        <div className="container-summary panel">
          <div className="container-icon">
            <Box size={26} />
          </div>
          <div>
            <h2>{selected.name}</h2>
            <p className="mono muted">{selected.image}</p>
          </div>
          <Badge status={selected.state} />
          <span className="container-id mono">{selected.id.slice(0, 12)}</span>
        </div>
        <div className="terminal-panel panel">
          <div className="panel-heading">
            <span>
              <Terminal size={17} />
              Container logs
            </span>
            <div className="log-actions">
              <label>
                <input
                  type="checkbox"
                  checked={follow}
                  onChange={(e) => setFollow(e.target.checked)}
                />
                Auto-scroll
              </label>
              <span className="live">
                <span />
                Polling every 1s
              </span>
            </div>
          </div>
          <ErrorMessage error={logError} />
          <pre
            ref={logRef}
            className="terminal-output"
            aria-label="Container logs"
          >
            {logs ||
              (logLoading
                ? "Loading logs…"
                : "No logs available for this container.")}
          </pre>
          <div className="terminal-footer">
            Last 300 lines<span>Timestamps enabled</span>
          </div>
        </div>
      </>
    );
  return (
    <>
      <div className="stats-row">
        <div className="stat">
          <span>All containers</span>
          <strong>{containers.length.toString().padStart(2, "0")}</strong>
          <Box size={21} />
        </div>
        <div className="stat">
          <span>Running</span>
          <strong>
            {containers
              .filter((c) => c.state === "running")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <span className="large-dot green" />
        </div>
        <div className="stat">
          <span>Stopped</span>
          <strong>
            {containers
              .filter((c) => c.state !== "running")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <span className="large-dot gray" />
        </div>
      </div>
      <div className="panel">
        <div className="table-top">
          <span className="section-label">
            Containers <span className="count">{containers.length}</span>
          </span>
          <div className="toolbar-actions">
            <label className="search">
              <Search size={15} />
              <input
                aria-label="Filter containers"
                placeholder="Find a container…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </label>
            <button
              className="secondary small"
              onClick={() => setRevision((n) => n + 1)}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
        <ErrorMessage error={error} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Container / Image</th>
                <th>Status</th>
                <th>Ports</th>
                <th>Container ID</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((container) => (
                <tr key={container.id}>
                  <td>
                    <button
                      className="container-name"
                      onClick={() => setSelected(container)}
                    >
                      <span className="mini-container">
                        <Box size={18} />
                      </span>
                      <span>
                        <strong>{container.name}</strong>
                        <small className="mono">{container.image}</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <Badge status={container.state} />
                    <small className="subtext">{container.status}</small>
                  </td>
                  <td className="mono muted ports">{container.ports || "—"}</td>
                  <td className="mono muted">{container.id.slice(0, 12)}</td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`View logs for ${container.name}`}
                      onClick={() => setSelected(container)}
                    >
                      <ArrowUpRight size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="loading" role="status">
            Loading containers…
          </div>
        )}
        {!loading && !error && !visible.length && (
          <Empty icon={Box} title="No containers found">
            Start a Docker container or change your filter.
          </Empty>
        )}
        <div className="panel-footer">
          <span>
            Docker Engine<span className="footer-divider">/</span>Local machine
          </span>
          <span className="muted">Select a container to view logs</span>
        </div>
      </div>
    </>
  );
}

function TaskDispatcher({ cwd }) {
  const [directory, setDirectory] = useState(cwd);
  const [prompt, setPrompt] = useState("");
  const [tasks, setTasks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [streamError, setStreamError] = useState("");
  const [sending, setSending] = useState(false);
  const [picker, setPicker] = useState(false);
  const [follow, setFollow] = useState(true);
  const outputRef = useRef(null);
  const selected = tasks.find((task) => task.id === selectedId);
  useEffect(() => {
    const controller = new AbortController();
    api("/api/tasks", { signal: controller.signal })
      .then((data) => {
        setTasks(data.tasks);
        setSelectedId(data.tasks[0]?.id ?? null);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);
  const runningIds = tasks
    .filter((task) => task.status === "running")
    .map((task) => task.id)
    .sort()
    .join(",");
  useEffect(() => {
    setStreamError("");
    const streams = runningIds
      .split(",")
      .filter(Boolean)
      .map((id) => {
        const source = new EventSource(`/api/tasks/${id}/events`);
        source.onmessage = (event) => {
          const next = JSON.parse(event.data);
          setStreamError("");
          setTasks((current) =>
            current.map((task) => (task.id === next.id ? next : task)),
          );
          if (next.status !== "running") source.close();
        };
        source.onerror = () =>
          setStreamError("Output connection interrupted. Reconnecting…");
        return source;
      });
    return () => streams.forEach((stream) => stream.close());
  }, [runningIds]);
  useEffect(() => {
    if (follow && outputRef.current)
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [selected?.output, selectedId, follow]);
  const dispatch = async (event) => {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const task = await api("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, cwd: directory }),
      });
      setTasks((current) => [task, ...current]);
      setSelectedId(task.id);
      setPrompt("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };
  return (
    <>
      <div className="dispatcher-grid">
        <form className="panel dispatch-form" onSubmit={dispatch}>
          <div className="panel-heading">
            <span>
              <Code2 size={18} />
              New task
            </span>
            <span className="quiet-badge">Codex CLI</span>
          </div>
          <div className="form-body">
            <label htmlFor="working-directory">Working directory</label>
            <div className="directory-input">
              <Folder size={17} />
              <input
                id="working-directory"
                required
                value={directory}
                onChange={(e) => setDirectory(e.target.value)}
              />
              <button type="button" onClick={() => setPicker(true)}>
                Browse
              </button>
            </div>
            <p className="field-hint">
              The directory Codex will use for this task.
            </p>
            <label htmlFor="task-prompt">Prompt</label>
            <textarea
              id="task-prompt"
              required
              maxLength={32000}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want Codex to do…"
            />
            <div className="permission-note">
              <span className="permission-icon">
                <Terminal size={14} />
              </span>
              <div>
                <strong>Full machine access</strong>
                <p>Tasks run with unrestricted permissions and no sandbox.</p>
              </div>
            </div>
            <ErrorMessage error={error} />
            <button
              className="primary dispatch-button"
              disabled={sending || !prompt.trim() || !directory.trim()}
            >
              <Play size={15} fill="currentColor" />
              {sending ? "Dispatching…" : "Dispatch task"}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </form>
        <div className="panel task-history">
          <div className="panel-heading">
            <span>
              <Clock3 size={17} />
              Recent tasks <span className="count">{tasks.length}</span>
            </span>
          </div>
          {tasks.length ? (
            <div className="task-list">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  className={`task-item ${selectedId === task.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(task.id)}
                >
                  <div>
                    <span className="task-prompt">{task.prompt}</span>
                    <ChevronRight size={15} />
                  </div>
                  <div>
                    <span className="mono task-id">{task.id.slice(0, 8)}</span>
                    <Badge status={task.status} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Empty icon={Code2} title="Ready when you are">
              Dispatch a task to see its progress here.
            </Empty>
          )}
          <div className="history-footer">
            Task history is kept for this server session.
          </div>
        </div>
      </div>
      <div className="terminal-panel panel task-output">
        <div className="panel-heading">
          <span>
            <Terminal size={17} />
            Task output {selected && <Badge status={selected.status} />}
          </span>
          <label className="auto-scroll">
            <input
              type="checkbox"
              checked={follow}
              onChange={(e) => setFollow(e.target.checked)}
            />
            Auto-scroll
          </label>
        </div>
        <ErrorMessage error={streamError} />
        <pre
          ref={outputRef}
          className="terminal-output"
          aria-label="Task output"
        >
          {selected
            ? selected.output || "Waiting for Codex output…"
            : "Your task’s output will appear here in real time."}
        </pre>
        <div className="terminal-footer">
          <span>
            {selected ? `Task ${selected.id.slice(0, 8)}` : "No task selected"}
          </span>
          <span>
            {selected
              ? selected.status === "running"
                ? "Streaming live"
                : `Process exited${selected.exitCode == null ? "" : ` with code ${selected.exitCode}`}`
              : "Streamed from Codex CLI"}
          </span>
        </div>
      </div>
      {picker && (
        <div className="modal-backdrop">
          <section
            className="directory-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Choose working directory"
            onKeyDown={(e) => {
              if (e.key === "Escape") setPicker(false);
            }}
          >
            <div className="modal-header">
              <h2>Choose working directory</h2>
              <button
                autoFocus
                className="icon-button"
                aria-label="Close directory picker"
                onClick={() => setPicker(false)}
              >
                <X size={19} />
              </button>
            </div>
            <DirectoryBrowser
              initialPath={directory || cwd}
              compact
              onSelect={(path) => {
                setDirectory(path);
                setPicker(false);
              }}
            />
          </section>
        </div>
      )}
    </>
  );
}

const sections = [
  {
    id: "files",
    label: "File Browser",
    icon: Folder,
    title: "File Browser",
    description: "Explore the files and folders on your machine.",
  },
  {
    id: "docker",
    label: "Docker Browser",
    icon: Box,
    title: "Docker Browser",
    description: "A closer look at your containers, from status to live logs.",
  },
  {
    id: "tasks",
    label: "Codex Task Dispatcher",
    icon: Code2,
    title: "Codex Task Dispatcher",
    description:
      "Turn a prompt into progress. Run tasks right on your machine.",
  },
];
function App() {
  const [section, setSection] = useState("files");
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/api/info")
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, []);
  const current = sections.find((item) => item.id === section);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Control Plane home">
          <span className="brand-mark">
            <Layers size={21} />
          </span>
          <span>
            control<span className="brand-light">plane</span>
            <small>YOUR MACHINE, IN VIEW</small>
          </span>
        </a>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${section === id ? "active" : ""}`}
              onClick={() => setSection(id)}
              aria-current={section === id ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {section === id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="machine-card">
            <span className="machine-icon">
              <HardDrive size={18} />
            </span>
            <div>
              <strong>Local machine</strong>
              <span>
                <span className={`status-dot ${error ? "offline" : ""}`} />
                {info ? "Connected" : error ? "Unavailable" : "Connecting…"}
              </span>
            </div>
          </div>
          <div className="sidebar-caption">
            Control Plane<span>v1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            Workspace
            <ChevronRight size={14} />
            <span>{current.label}</span>
          </div>
          <span className="local-chip">
            <span className="status-dot" />
            LOCAL ENVIRONMENT
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">MACHINE WORKSPACE</div>
              <h1>{current.title}</h1>
              <p>{current.description}</p>
            </div>
            {section === "files" && (
              <span className="read-only">
                <Circle size={12} />
                Read-only
              </span>
            )}
            {section === "docker" && (
              <span className="read-only">
                <Box size={14} />
                Docker Engine
              </span>
            )}
            {section === "tasks" && (
              <span className="read-only">
                <Terminal size={14} />
                Local execution
              </span>
            )}
          </div>
          <ErrorMessage error={error} />
          {!info && !error && (
            <div className="loading">Connecting to your machine…</div>
          )}
          {info &&
            (section === "files" ? (
              <DirectoryBrowser initialPath={info.cwd} />
            ) : section === "docker" ? (
              <DockerBrowser />
            ) : (
              <TaskDispatcher cwd={info.cwd} />
            ))}
          <div className="page-footnote">
            <span className="tiny-line" />
            One machine. A little more clarity.
          </div>
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
