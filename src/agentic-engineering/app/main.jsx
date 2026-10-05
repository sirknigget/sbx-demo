import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  async function send(event) {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setStatus('');
    try {
      const response = await fetch('/api/log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('Request failed');
      setStatus('Sent. Your words are in the Docker log.');
      setText('');
    } catch {
      setStatus('Couldn’t send. Give it another try.');
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="page">
      <header>
        <div className="brand"><span className="brand-icon" aria-hidden="true">✳</span> AE<span className="brand-dot">.</span></div>
        <span className="header-note">LESS NOISE. MORE INTENT.</span>
        <span className="runtime"><span /> RUNNING IN DOCKER</span>
      </header>
      <main>
        <section className="hero" aria-labelledby="title">
          <div className="hero-copy">
            <div className="eyebrow"><span className="mini-line" /> A LITTLE LESS ARTIFICIAL. A LOT MORE INTENTIONAL.</div>
            <h1 id="title">Agentic<br />Engineering<span className="title-dot">.</span></h1>
            <div className="manifesto"><span>Stop with the slop.</span><svg viewBox="0 0 80 48" aria-hidden="true"><path d="M3 25C25 13 38 35 70 20M52 5l20 14-14 24" /></svg></div>
            <p className="intro">Good tools. Clear intent. Actual output.<br />Less generating for the sake of it. More making it count.</p>
          </div>
          <div className="art" aria-hidden="true">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="lime-disc"><svg viewBox="0 0 160 160"><path d="M80 18v124M18 80h124M36 36l88 88M36 124l88-88" /></svg></div>
            <span className="art-label">INTENT → ACTION</span>
            <div className="terminal">
              <div className="terminal-bar"><div><i /><i /><i /></div><span>the real world</span><span>↗</span></div>
              <div className="terminal-body"><p><span className="prompt">❯</span> less slop</p><p><span className="prompt">❯</span> more substance</p><p className="terminal-result">✓ make something that matters<span className="cursor" /></p></div>
            </div>
            <div className="sticker">SHIP<br />WITH<br /><span>INTENT.</span><span className="sticker-star">✳</span></div>
            <span className="art-caption">HUMAN DIRECTION. MACHINE EXECUTION.</span>
          </div>
        </section>
        <section className="send-panel" aria-labelledby="send-title">
          <div className="panel-heading"><span className="section-number">01 / MAKE IT REAL</span><span className="panel-mark" aria-hidden="true">↙</span></div>
          <div className="panel-content">
            <div className="panel-copy"><h2 id="send-title">Less talk. More log.</h2><p>One thought. Straight to the container.</p></div>
            <form onSubmit={send}>
              <label htmlFor="message">YOUR MESSAGE</label>
              <div className="input-row"><input id="message" placeholder="Make every word count…" maxLength={2000} required value={text} onChange={e => setText(e.target.value)} /><button disabled={sending} type="submit">{sending ? 'Sending…' : 'Send to Docker log'}<span aria-hidden="true">↗</span></button></div>
              <div className="form-note" role="status">{status || <><span className="small-dot" /> YOUR INPUT → BACKEND → DOCKER CONSOLE</>}</div>
            </form>
          </div>
        </section>
      </main>
      <footer><span>BUILT WITH INTENT<span className="footer-star">✳</span></span><span>NO FLUFF. JUST THE STUFF.</span><span>AGENTIC ENGINEERING / 001</span></footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
