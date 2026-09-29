import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

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
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!response.ok) throw new Error('Request failed');
      setMessage('');
      setStatus('Sent. Check the Docker backend log.');
    } catch {
      setStatus('Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="topbar">
        <div className="brand"><span className="brand-mark">✳</span><span>AGENTIC<span className="brand-light">ENGINEERING</span></span></div>
        <span className="edition">THE NO-SLOP EDITION <span className="edition-dot">●</span> 001</span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="eyebrow"><span className="eyebrow-spark">✦</span> A SMALL EXPERIMENT IN DOING THE WORK</div>
        <h1 id="hero-title"><span>Agentic</span><br /><span>Engineering<span className="period">.</span></span></h1>
        <div className="slogan-row"><span className="stroke" aria-hidden="true" /><p>Stop with the <em>slop.</em></p></div>
        <p className="intro">Less noise. More signal. Send a thought straight into the machine and watch it show up where the work happens.</p>

        <form className="send-form" onSubmit={sendMessage}>
          <label htmlFor="message">YOUR MESSAGE</label>
          <div className="input-row">
            <input id="message" name="message" type="text" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type something worth logging..." maxLength={500} required />
            <button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send to Docker log'} <span aria-hidden="true">↗</span></button>
          </div>
          <p className="form-note" role="status" aria-live="polite">{status || 'ONE INPUT. ONE ACTION. NO EXTRA CEREMONY.'}</p>
        </form>
      </section>

      <aside className="sticker" aria-hidden="true"><span>MAKE<br />IT<br />REAL</span><span className="sticker-star">✳</span></aside>
      <footer className="footer"><span>BUILT TO SHIP, NOT TO IMPRESS A PROMPT.</span><span>© 2026 / AE LAB</span></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
