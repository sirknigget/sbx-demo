import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="hello-shell" aria-label="Hello World app">
      <section className="hero-panel">
        <div className="color-ribbon" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <p className="eyebrow">React in Docker</p>
        <h1>Hello World</h1>
        <p className="summary">
          A bright, responsive demo app served from a container on port 3000.
        </p>
        <div className="spark-row" aria-label="Color swatches">
          <span className="swatch swatch-coral" />
          <span className="swatch swatch-gold" />
          <span className="swatch swatch-mint" />
          <span className="swatch swatch-sky" />
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
