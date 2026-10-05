import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./style.css";

function App() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    setStatus("");
    try {
      const response = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!response.ok) throw new Error("Request failed");
      setMessage("");
      setStatus("Sent to the Docker log.");
    } catch {
      setStatus("Could not send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="page">
      <div className="glow glow-one" aria-hidden="true" />
      <div className="glow glow-two" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <div className="frame">
        <div className="eyebrow">
          <span className="eyebrow-mark" /> THE HUMAN IN THE LOOP CLUB{" "}
          <span className="eyebrow-line" />
        </div>

        <section className="hero" aria-labelledby="headline">
          <div className="hero-copy">
            <p className="kicker">A SMALL MANIFESTO FOR BETTER WORK</p>
            <h1 id="headline">
              Agentic
              <br />
              <span>
                Engineering<span className="period">.</span>
              </span>
            </h1>
            <div className="statement">
              <span className="statement-rule" />
              <p>
                Stop with
                <br />
                the <em>slop.</em>
              </p>
            </div>
            <p className="description">
              Good tools make room for good judgment. Say something worth
              shipping.
            </p>
          </div>

          <div className="art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-disc">
              <span className="disc-spark">✳</span>
              <span className="disc-text">
                THINK
                <br />
                THEN
                <br />
                BUILD
              </span>
            </div>
            <div className="art-star star-one">✳</div>
            <div className="art-star star-two">✳</div>
            <div className="art-caption">
              LESS NOISE
              <br />
              MORE SIGNAL ↗
            </div>
          </div>
        </section>

        <form className="message-form" onSubmit={handleSubmit}>
          <label htmlFor="message">
            YOUR MESSAGE TO THE MACHINE <span>↘</span>
          </label>
          <div className="form-row">
            <input
              id="message"
              name="message"
              type="text"
              placeholder="Type something worth logging..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={500}
              required
            />
            <button type="submit" disabled={sending}>
              {sending ? "Sending…" : "Send to Docker log"}{" "}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
          <p className="status" role="status" aria-live="polite">
            {status}
          </p>
        </form>

        <footer>
          <span>IDEAS IN. SIGNAL OUT.</span>
          <span>BUILT WITH INTENTION © 2026</span>
        </footer>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
