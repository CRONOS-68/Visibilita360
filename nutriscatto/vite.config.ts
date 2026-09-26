import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In sviluppo le chiamate /api vanno al server Node (npm run dev:api, porta 8787).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: { outDir: 'dist', sourcemap: false },
});
