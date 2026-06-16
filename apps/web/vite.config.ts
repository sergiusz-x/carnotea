import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@/components': resolve(import.meta.dirname, 'src/components'),
      '@/lib': resolve(import.meta.dirname, 'src/lib'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
