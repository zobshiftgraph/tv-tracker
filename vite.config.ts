import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base:
    process.env.VITE_BASE ||
    (mode === 'standalone' ? './' : mode === 'pages' ? '/family-dashboard/tv/' : '/'),
  build: {
    outDir: mode === 'standalone' ? 'standalone' : 'dist',
    emptyOutDir: true,
  },
  server: { port: 5174 },
}));
