import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="app-shell">
      <section className="hello-stage" aria-label="Colorful Hello World greeting">
        <div className="sunburst" aria-hidden="true" />
        <p className="eyebrow">React inside Docker</p>
        <h1>Hello World</h1>
        <p className="intro">
          A bright, responsive React app served from a container on port 3000.
        </p>
        <div className="color-row" aria-hidden="true">
          <span className="swatch coral" />
          <span className="swatch yellow" />
          <span className="swatch mint" />
          <span className="swatch sky" />
          <span className="swatch violet" />
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
