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
    proxy: {
      '/api': {
        target: 'http://localhost:9080',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'http://localhost:9080',
        ws: true,
        changeOrigin: true,
      },
      '/sync-cursor': {
        target: 'http://localhost:9080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})