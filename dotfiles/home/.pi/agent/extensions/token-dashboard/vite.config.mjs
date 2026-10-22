import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root,
  base: './',
  build: {
    outDir: join(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: join(root, 'index.html'), output: { entryFileNames: 'app.js', assetFileNames: 'app.js' } },
  },
});
