import { resolve } from 'node:path';

import { ROUTES } from '@carnotea/shared';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { computeBuildInfo } from './src/lib/build-version';

function buildInfoPlugin(buildInfo: ReturnType<typeof computeBuildInfo>): Plugin {
  const source = `${JSON.stringify(buildInfo, null, 2)}\n`;

  return {
    name: 'carnotea-build-info',
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.end(source);
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source,
      });
    },
  };
}

export default defineConfig(() => {
  const buildInfo = computeBuildInfo({ cwd: import.meta.dirname });

  return {
    define: {
      __APP_BUILD_INFO__: JSON.stringify(buildInfo),
    },
    plugins: [
      tailwindcss(),
      react(),
      buildInfoPlugin(buildInfo),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkOnly',
            },
          ],
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
  };
});
