import { resolve } from 'node:path';

import { ROUTES } from '@carnotea/shared';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@/components': resolve(import.meta.dirname, 'src/components'),
      '@/features': resolve(import.meta.dirname, 'src/features'),
      '@/lib': resolve(import.meta.dirname, 'src/lib'),
      '@/routes': resolve(import.meta.dirname, 'src/routes'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3001',
      [ROUTES.healthz]: 'http://localhost:3001',
    },
  },
});
