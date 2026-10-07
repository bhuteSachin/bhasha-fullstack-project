import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:5000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true, // Expose to network (0.0.0.0)
    port: 5173, // Default port, change if needed
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/auth': { target: apiTarget, changeOrigin: true },
      '/translate': { target: apiTarget, changeOrigin: true },
      '/uploads': { target: apiTarget, changeOrigin: true },
      '/socket.io': { target: apiTarget, changeOrigin: true, ws: true },
    },
  },
})
