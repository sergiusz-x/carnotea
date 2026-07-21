import { resolve } from 'node:path';

import { ROUTES } from '@carnotea/shared';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { computeBuildInfo } from './src/lib/build-version';

function buildInfoPlugin(buildInfo: Awaited<ReturnType<typeof computeBuildInfo>>): Plugin {
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

function serviceWorkerRegistrationPlugin(): Plugin {
  const script = [
    '<script id="carnotea-sw-registration">',
    "if('serviceWorker' in navigator){",
    'let refreshing=false;',
    "navigator.serviceWorker.addEventListener('controllerchange',()=>{",
    'if(refreshing)return;',
    'refreshing=true;',
    'window.location.reload();',
    '});',
    'const activateWaiting=(registration)=>{',
    "if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});",
    '};',
    "window.addEventListener('load',()=>{",
    "navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then((registration)=>{",
    'activateWaiting(registration);',
    "registration.addEventListener('updatefound',()=>{",
    'const worker=registration.installing;',
    'if(!worker)return;',
    "worker.addEventListener('statechange',()=>{",
    "if(worker.state==='installed'&&navigator.serviceWorker.controller){",
    'activateWaiting(registration);',
    '}',
    '});',
    '});',
    'return registration.update().then(()=>activateWaiting(registration));',
    '}).catch(()=>{});',
    '});',
    '}',
    '</script>',
  ].join('');

  return {
    name: 'carnotea-sw-registration',
    transformIndexHtml(html) {
      return html.replace('</head>', `${script}</head>`);
    },
  };
}

export default defineConfig(async () => {
  const buildInfo = await computeBuildInfo({ cwd: import.meta.dirname });

  return {
    define: {
      __APP_BUILD_INFO__: JSON.stringify(buildInfo),
    },
    plugins: [
      tailwindcss(),
      react(),
      buildInfoPlugin(buildInfo),
      serviceWorkerRegistrationPlugin(),
      VitePWA({
        injectRegister: false,
        registerType: 'autoUpdate',
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/version\.json$/, /^\/api\//, /^\/healthz$/, /^\/readyz$/],
        },
      }),
    ],
    resolve: {
      alias: {
        '@/components': resolve(import.meta.dirname, 'src/components'),
        '@/features': resolve(import.meta.dirname, 'src/features'),
        '@/lib': resolve(import.meta.dirname, 'src/lib'),
        '@/offline': resolve(import.meta.dirname, 'src/offline'),
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
