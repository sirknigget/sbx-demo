import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Command,
  Container,
  CornerDownRight,
  File,
  FileText,
  Folder,
  FolderClosed,
  HardDrive,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Terminal,
  X,
} from "lucide-react";
import "./styles.css";
import "./picker.css";

const sections = [
  {
    id: "files",
    label: "File Browser",
    icon: FolderClosed,
    description: "Explore the filesystem",
  },
  {
    id: "docker",
    label: "Docker Browser",
    icon: Container,
    description: "Containers & logs",
  },
  {
    id: "tasks",
    label: "Codex Task Dispatcher",
    icon: Terminal,
    description: "Run autonomous tasks",
  },
];

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function App() {
  const [section, setSection] = useState("files");
  const [home, setHome] = useState("/");
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    api("/api/meta")
      .then((data) => setHome(data.home))
      .catch(() => {});
  }, []);
  const selected = sections.find((item) => item.id === section);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Command size={21} strokeWidth={2.4} />
          </div>
          <div>
            <div className="brand-name">
              control<span>plane</span>
            </div>
            <div className="brand-subtitle">LOCAL WORKSPACE</div>
          </div>
          <button
            className="mobile-close icon-button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {sections.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${section === item.id ? "active" : ""}`}
              onClick={() => {
                setSection(item.id);
                setMobileOpen(false);
              }}
            >
              <item.icon size={19} strokeWidth={1.9} />
              <span>{item.label}</span>
              {section === item.id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-bottom-title">
            <span className="live-dot" /> SYSTEM ONLINE
          </div>
          <p>Your local development environment is ready.</p>
          <div className="sidebar-bottom-line" />
          <div className="sidebar-footer">
            <Code2 size={16} /> Powered by Codex <span>v1.0</span>
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="content-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={15} />
            <strong>{selected.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="environment">
              <span className="env-dot" /> Local environment
            </span>
            <div className="avatar">CP</div>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" /> CONTROL CENTER
              </div>
              <h1>{selected.label}</h1>
              <p>
                {selected.description === "Explore the filesystem"
                  ? "Browse directories and discover files across your machine."
                  : selected.description === "Containers & logs"
                    ? "Monitor containers and inspect their live output."
                    : "Send a prompt to Codex and follow its progress in real time."}
              </p>
            </div>
            <div className="heading-icon">
              <selected.icon size={26} strokeWidth={1.6} />
            </div>
          </div>
          {section === "files" && <Files home={home} />}
          {section === "docker" && <Docker />}
          {section === "tasks" && <Tasks home={home} />}
        </main>
      </div>
    </div>
  );
}

function PanelHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="panel-header">
      <div className="panel-title-wrap">
        <div className="small-icon">
          <Icon size={17} />
        </div>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
function ErrorMessage({ error }) {
  return error ? <div className="error-message">{error}</div> : null;
}

function Files({ home }) {
  const [location, setLocation] = useState("");
  const [input, setInput] = useState("");
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const go = async (next) => {
    setLoading(true);
    setError("");
    try {
      const data = await api(`/api/files?path=${encodeURIComponent(next)}`);
      setListing(data);
      setLocation(data.path);
      setInput(data.path);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (home) go(home);
  }, [home]);
  const entries =
    listing?.entries.filter((entry) =>
      entry.name.toLowerCase().includes(query.toLowerCase()),
    ) || [];
  const crumbs = listing?.path.split("/").filter(Boolean) || [];
  return (
    <div className="page-stack">
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-icon purple">
            <HardDrive size={19} />
          </div>
          <div>
            <span>Current location</span>
            <strong className="truncate">
              {listing?.path || "Loading..."}
            </strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <Folder size={19} />
          </div>
          <div>
            <span>Folders</span>
            <strong>
              {listing?.entries.filter((e) => e.type === "directory").length ??
                "—"}
            </strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FileText size={19} />
          </div>
          <div>
            <span>Files</span>
            <strong>
              {listing?.entries.filter((e) => e.type !== "directory").length ??
                "—"}
            </strong>
          </div>
        </div>
      </div>
      <section className="panel browser-panel">
        <PanelHeader
          icon={FolderClosed}
          title="Directory explorer"
          subtitle="Browse folders without opening file contents"
          action={
            <span className="read-only">
              <span className="read-dot" /> READ ONLY
            </span>
          }
        />
        <div className="location-bar">
          <div className="location-input-wrap">
            <span className="path-label">PATH</span>
            <input
              aria-label="Directory path"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go(input)}
            />
            <button
              className="go-button"
              onClick={() => go(input)}
              aria-label="Go to directory"
            >
              <ArrowRight size={18} />
            </button>
          </div>
          <button
            className="outline-button"
            onClick={() => go(location || home)}
            aria-label="Refresh files"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
        <div className="browser-tools">
          <div className="breadcrumbs">
            <button onClick={() => go("/")}>
              <HardDrive size={15} />
            </button>
            {crumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <ChevronRight size={14} />
                <button
                  onClick={() => go("/" + crumbs.slice(0, index + 1).join("/"))}
                >
                  {crumb}
                </button>
              </React.Fragment>
            ))}
          </div>
          <div className="search-box">
            <Search size={16} />
            <input
              aria-label="Filter files"
              placeholder="Filter files..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <ErrorMessage error={error} />
        <div className="table-head file-grid">
          <span>NAME</span>
          <span>TYPE</span>
          <span></span>
        </div>
        <div className="file-list">
          {listing?.parent && (
            <button
              className="file-row file-grid"
              onClick={() => go(listing.parent)}
            >
              <span className="file-name">
                <span className="file-icon back">
                  <ArrowLeft size={17} />
                </span>
                .. <small>Parent directory</small>
              </span>
              <span className="type-cell">Directory</span>
              <ChevronRight className="row-chevron" size={17} />
            </button>
          )}
          {entries.map((entry) => (
            <button
              className="file-row file-grid"
              key={entry.name}
              onClick={() =>
                entry.type === "directory" &&
                go(`${listing.path.replace(/\/$/, "")}/${entry.name}`)
              }
              disabled={entry.type !== "directory"}
            >
              <span className="file-name">
                <span className={`file-icon ${entry.type}`}>
                  <EntryIcon type={entry.type} />
                </span>
                {entry.name}
              </span>
              <span className="type-cell">
                {entry.type === "directory"
                  ? "Folder"
                  : entry.type === "link"
                    ? "Symbolic link"
                    : "File"}
              </span>
              {entry.type === "directory" ? (
                <ChevronRight className="row-chevron" size={17} />
              ) : (
                <span />
              )}
            </button>
          ))}
          {!loading && listing && entries.length === 0 && (
            <div className="empty-state">No files match your search.</div>
          )}
          {loading && (
            <div className="empty-state">
              <LoaderCircle className="spin" size={18} /> Loading directory...
            </div>
          )}
        </div>
        <div className="panel-foot">
          Showing {entries.length} items{" "}
          <span>Directories only · File contents are never displayed</span>
        </div>
      </section>
    </div>
  );
}
function EntryIcon({ type }) {
  return type === "directory" ? (
    <Folder size={19} fill="currentColor" strokeWidth={1.5} />
  ) : (
    <File size={19} strokeWidth={1.7} />
  );
}

function Docker() {
  const [containers, setContainers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [logs, setLogs] = useState("");
  const [error, setError] = useState("");
  const [logError, setLogError] = useState("");
  const refresh = async () => {
    try {
      const data = await api("/api/containers");
      setContainers(data);
      setError("");
      setSelected((current) =>
        current
          ? data.find((row) => row.id === current.id) || null
          : data[0] || null,
      );
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    const fetchLogs = async () => {
      try {
        const data = await api(`/api/containers/${selected.id}/logs`);
        if (active) {
          setLogs(data.logs);
          setLogError("");
        }
      } catch (e) {
        if (active) setLogError(e.message);
      }
    };
    setLogs("");
    fetchLogs();
    const timer = setInterval(fetchLogs, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selected?.id]);
  const running = containers.filter(
    (c) => c.state?.toLowerCase() === "running",
  ).length;
  return (
    <div className="page-stack">
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-icon purple">
            <Box size={19} />
          </div>
          <div>
            <span>Total containers</span>
            <strong>{containers.length}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <Activity size={19} />
          </div>
          <div>
            <span>Running</span>
            <strong>{running}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gray">
            <Clock3 size={19} />
          </div>
          <div>
            <span>Stopped</span>
            <strong>{containers.length - running}</strong>
          </div>
        </div>
      </div>
      <div className="docker-grid">
        <section className="panel containers-panel">
          <PanelHeader
            icon={Container}
            title="Containers"
            subtitle="All local Docker containers"
            action={
              <button
                className="icon-button"
                aria-label="Refresh containers"
                onClick={refresh}
              >
                <RefreshCw size={17} />
              </button>
            }
          />
          <ErrorMessage error={error} />
          <div className="container-list">
            {containers.map((container) => (
              <button
                key={container.id}
                className={`container-item ${selected?.id === container.id ? "selected" : ""}`}
                onClick={() => setSelected(container)}
              >
                <span className="container-avatar">
                  <Box size={20} />
                </span>
                <span className="container-details">
                  <strong>{container.name}</strong>
                  <small>{container.image}</small>
                  <span
                    className={`status-pill ${container.state?.toLowerCase() === "running" ? "running" : "stopped"}`}
                  >
                    <span /> {container.state}
                  </span>
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
            {!error && containers.length === 0 && (
              <div className="empty-state">No containers found.</div>
            )}
          </div>
        </section>
        <section className="panel logs-panel">
          <PanelHeader
            icon={Terminal}
            title="Container logs"
            subtitle={
              selected
                ? `Live output from ${selected.name}`
                : "Select a container to view logs"
            }
            action={
              <span className="live-badge">
                <span /> LIVE · 1S
              </span>
            }
          />
          <div className="logs-meta">
            <span>
              <span className="meta-label">CONTAINER</span>
              {selected?.name || "—"}
            </span>
            <span>
              <span className="meta-label">STATUS</span>
              <span
                className={
                  selected?.state?.toLowerCase() === "running"
                    ? "text-green"
                    : ""
                }
              >
                {selected?.status || "—"}
              </span>
            </span>
          </div>
          <ErrorMessage error={logError} />
          <pre className="terminal-output" aria-label="Container logs">
            {logs ||
              (selected
                ? "Waiting for container output..."
                : "Select a container to view its logs.")}
          </pre>
          <div className="panel-foot">
            <span className="log-live-dot" /> Auto-refreshing every second{" "}
            <span>Last 200 lines</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function Tasks({ home }) {
  const [prompt, setPrompt] = useState("");
  const [cwd, setCwd] = useState("");
  const [tasks, setTasks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const outputRef = useRef(null);
  useEffect(() => {
    if (home && !cwd) setCwd(home);
  }, [home]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const data = await api("/api/tasks");
        if (active) {
          setTasks(data);
          setSelectedId((current) => current || data[0]?.id || null);
        }
      } catch (e) {
        if (active) setError(e.message);
      }
    };
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    let active = true;
    const refresh = async () => {
      try {
        const data = await api(`/api/tasks/${selectedId}`);
        if (active) setSelected(data);
      } catch (e) {
        if (active) setError(e.message);
      }
    };
    refresh();
    const timer = setInterval(refresh, 300);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedId]);
  useEffect(() => {
    if (outputRef.current)
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [selected?.output]);
  const dispatch = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const task = await api("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, cwd }),
      });
      setTasks((current) => [task, ...current]);
      setSelectedId(task.id);
      setPrompt("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="page-stack">
      <div className="dispatcher-intro">
        <div className="dispatcher-mark">
          <Command size={24} />
        </div>
        <div>
          <strong>Give Codex a task</strong>
          <p>
            Write a clear prompt, choose a working directory, and watch the work
            unfold.
          </p>
        </div>
        <span className="model-pill">
          GPT-6-SOL <span>·</span> MEDIUM
        </span>
      </div>
      <div className="task-grid">
        <section className="panel dispatch-panel">
          <PanelHeader
            icon={Send}
            title="New task"
            subtitle="Dispatch a single prompt to Codex"
          />
          <form onSubmit={dispatch} className="dispatch-form">
            <label htmlFor="task-prompt">
              PROMPT <span>REQUIRED</span>
            </label>
            <textarea
              id="task-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you'd like Codex to do..."
              required
              rows={7}
            />
            <div className="field-hint">
              Be specific about the outcome you want.
            </div>
            <label htmlFor="task-cwd">
              WORKING DIRECTORY <span>REQUIRED</span>
            </label>
            <div className="cwd-input">
              <Folder size={18} />
              <input
                id="task-cwd"
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                placeholder="/path/to/project"
                required
              />
              <button
                type="button"
                className="pick-button"
                onClick={() => setPickerOpen(true)}
                aria-label="Choose working directory"
              >
                Browse
              </button>
            </div>
            <div className="permission-note">
              <Activity size={17} />
              <span>
                Codex runs locally with full, unrestricted permissions.
              </span>
            </div>
            <ErrorMessage error={error} />
            <button
              type="submit"
              className="primary-button"
              disabled={submitting || !prompt.trim() || !cwd.trim()}
            >
              {submitting ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Play size={17} fill="currentColor" />
              )}{" "}
              Dispatch task <ArrowRight size={17} />
            </button>
          </form>
        </section>
        <section className="panel output-panel">
          <PanelHeader
            icon={Terminal}
            title="Task output"
            subtitle={
              selected
                ? `Task ${selected.id.slice(0, 8)}`
                : "Real-time execution stream"
            }
            action={
              selected && (
                <span className={`task-status ${selected.status}`}>
                  <span />
                  {selected.status}
                </span>
              )
            }
          />
          <div className="output-toolbar">
            <span>
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
            </span>
            <span>codex · {selected?.cwd || "waiting for task"}</span>
            <MoreHorizontal size={17} />
          </div>
          <pre className="task-output" ref={outputRef} aria-label="Task output">
            {selected?.output ||
              (selected
                ? "Waiting for Codex output..."
                : "Dispatch a task to see its output here.")}
            <span className="cursor" />
          </pre>
          <div className="panel-foot">
            <span className="log-live-dot" /> Output updates in real time{" "}
            <span>
              {selected ? `Status: ${selected.status}` : "Ready to dispatch"}
            </span>
          </div>
        </section>
      </div>
      <section className="panel history-panel">
        <PanelHeader
          icon={Clock3}
          title="Recent tasks"
          subtitle="Your dispatch history for this session"
          action={<span className="count-badge">{tasks.length} TASKS</span>}
        />
        <div className="history-list">
          {tasks.length ? (
            tasks.map((task) => (
              <button
                key={task.id}
                className={`history-item ${task.id === selectedId ? "selected" : ""}`}
                onClick={() => setSelectedId(task.id)}
              >
                <span className={`history-status ${task.status}`}>
                  <span />
                </span>
                <span className="history-prompt">{task.prompt}</span>
                <span className="history-cwd">{task.cwd}</span>
                <span className="history-state">{task.status}</span>
                <ChevronRight size={16} />
              </button>
            ))
          ) : (
            <div className="empty-state">
              No tasks yet. Dispatch one to get started.
            </div>
          )}
        </div>
      </section>
      {pickerOpen && (
        <DirectoryPicker
          initialPath={cwd || home}
          onClose={() => setPickerOpen(false)}
          onChoose={(directory) => {
            setCwd(directory);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function DirectoryPicker({ initialPath, onClose, onChoose }) {
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");
  const go = async (directory) => {
    try {
      setError("");
      setListing(await api(`/api/files?path=${encodeURIComponent(directory)}`));
    } catch (e) {
      setError(e.message);
    }
  };
  useEffect(() => {
    go(initialPath);
  }, [initialPath]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="directory-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Choose working directory"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>Choose working directory</h2>
            <p>Browse the machine and select a folder for Codex.</p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close folder picker"
          >
            <X size={18} />
          </button>
        </div>
        <div className="picker-path">
          <Folder size={16} />
          {listing?.path || initialPath}
        </div>
        <ErrorMessage error={error} />
        <div className="picker-list">
          {listing?.parent && (
            <button onClick={() => go(listing.parent)}>
              <ArrowLeft size={17} /> Parent directory
            </button>
          )}
          {listing?.entries
            .filter((entry) => entry.type === "directory")
            .map((entry) => (
              <button
                key={entry.name}
                onClick={() =>
                  go(`${listing.path.replace(/\/$/, "")}/${entry.name}`)
                }
              >
                <Folder size={17} />
                {entry.name}
                <ChevronRight size={15} />
              </button>
            ))}
        </div>
        <div className="modal-actions">
          <button className="outline-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-button"
            onClick={() => listing && onChoose(listing.path)}
          >
            Use this directory <Check size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
