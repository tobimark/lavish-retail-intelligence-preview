import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { watch: { ignored: ['**/design/screenshots/**', '**/qa-output/**'] } },
  build: { rollupOptions: { output: { manualChunks: { 'scene-engine': ['three'] } } } },
});
