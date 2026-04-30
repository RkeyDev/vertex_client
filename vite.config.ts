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
    // Port for the frontend dev server
    port: 5174, 
    proxy: {
      /**
       * Proxying API requests to the Spring Boot backend.
       * A request to http://localhost:5174/api/v1/auth/login 
       * will be forwarded to http://localhost:8080/api/v1/auth/login
       */
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        // Optional: rewrite path if the backend doesn't expect the "/api" prefix
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Proxying WebSocket connections for real-time UML collaboration
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
      },
    },
  },
})