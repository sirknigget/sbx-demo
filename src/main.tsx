import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="app-shell" aria-label="Colorful Hello World app">
      <section className="hello-panel">
        <div className="spark spark-one" />
        <div className="spark spark-two" />
        <p className="eyebrow">React on port 3000</p>
        <h1>Hello World</h1>
        <p className="tagline">A bright little app with a fast Vite build and Playwright coverage.</p>
        <div className="color-row" aria-label="Color palette">
          <span className="swatch coral" />
          <span className="swatch lemon" />
          <span className="swatch mint" />
          <span className="swatch sky" />
          <span className="swatch violet" />
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
