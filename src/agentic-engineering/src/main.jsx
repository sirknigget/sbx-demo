import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/dm-sans/800.css';
import '@fontsource/dm-sans/900.css';
import '@fontsource/dm-mono/500.css';
import './style.css';

function App() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  async function sendMessage(event) {
    event.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    setStatus('');
    try {
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) throw new Error('Request failed');
      setMessage('');
      setStatus('Sent to Docker log.');
    } catch {
      setStatus('Could not send. Try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="page">
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">✳</span> AE / 001</div>
        <span className="topbar-note">BUILD THINGS THAT MEAN SOMETHING <span aria-hidden="true">↗</span></span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="eyebrow"><span className="eyebrow-dot" /> A SMALL MANIFESTO FOR THE BUILDERS</div>
        <div className="headline-wrap">
          <span className="spark spark-one" aria-hidden="true">✳</span>
          <h1 id="hero-title">AGENTIC<br /><em>ENGINEERING</em><span className="period">.</span></h1>
          <span className="spark spark-two" aria-hidden="true">✴</span>
        </div>
        <div className="hero-bottom">
          <p className="manifesto">STOP WITH<br />THE <span>SLOP.</span></p>
          <p className="intro">Less noise. More intention.<br />Make every move count.</p>
        </div>
      </section>

      <section className="send-panel" aria-labelledby="send-title">
        <div className="panel-copy">
          <span className="panel-index">01 / MAKE IT REAL</span>
          <h2 id="send-title">Put a thought<br />into the machine<span>.</span></h2>
          <p>One message. Straight to the Docker log.</p>
        </div>
        <form onSubmit={sendMessage} className="message-form">
          <label htmlFor="message">YOUR THOUGHT, IN YOUR WORDS</label>
          <textarea id="message" name="message" rows="3" maxLength="2000" placeholder="What are you building?" value={message} onChange={(event) => setMessage(event.target.value)} required />
          <div className="form-bottom">
            <span className="form-hint">NO FLUFF. JUST SIGNAL. ↗</span>
            <button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send to Docker log'} <span aria-hidden="true">↗</span></button>
          </div>
          <p className="status" role="status" aria-live="polite">{status}</p>
        </form>
      </section>

      <footer><span>GOOD WORK IS A CHOICE.</span><span>AGENTIC ENGINEERING © 2026</span></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
