import { preview } from 'vite';

await preview({
  configFile: false,
  preview: { port: 4173, strictPort: true },
  plugins: [
    {
      name: 'lighthouse-anonymous-session',
      configurePreviewServer(server) {
        server.middlewares.use('/api/auth/get-session', (_request, response) => {
          response.setHeader('Content-Type', 'application/json');
          response.end('null');
        });
      },
    },
  ],
});
console.log('Lighthouse server ready');
