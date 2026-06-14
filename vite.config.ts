import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5174,
    strictPort: true,
    allowedHosts: [
      'host.docker.internal',
      'localhost',
      '127.0.0.1'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:9080',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // If the browser requested via host.docker.internal, redirect backend bound traffic to the docker bridge
            if (req.headers.host?.includes('host.docker.internal')) {
              proxyReq.host = 'host.docker.internal';
            }
          });
        }
      },
      '/ws': {
        target: 'http://localhost:9080',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers.host?.includes('host.docker.internal')) {
              proxyReq.host = 'host.docker.internal';
            }
          });
        }
      },
      '/sync-cursor': {
        target: 'http://localhost:9080',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers.host?.includes('host.docker.internal')) {
              proxyReq.host = 'host.docker.internal';
            }
          });
        }
      },
    },
  },
})