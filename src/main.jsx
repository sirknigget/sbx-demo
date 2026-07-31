import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="app-shell" aria-label="Colorful Hello World app">
      <section className="hero">
        <div className="spark spark-one" />
        <div className="spark spark-two" />
        <div className="content">
          <p className="eyebrow">React + Docker</p>
          <h1>Hello World</h1>
          <p className="subtitle">
            A bright, responsive starter running from a container on port 3000.
          </p>
          <div className="color-row" aria-hidden="true">
            <span className="swatch cyan" />
            <span className="swatch coral" />
            <span className="swatch lemon" />
            <span className="swatch green" />
          </div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
