import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // ── Vendor chunk: React core ──
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // ── Vendor chunk: Framer Motion (animation engine) ──
          'vendor-motion': ['framer-motion'],
        },
      },
    },
    // Target modern browsers for smaller output
    target: 'es2020',
    // Enable source maps for production debugging
    sourcemap: false,
    // Chunk size warning threshold (KB)
    chunkSizeWarningLimit: 600,
  },
});
