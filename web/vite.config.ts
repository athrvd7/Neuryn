import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: '../public',
  build: {
    outDir: 'dist',
  },
  server: {
    // Forward /api/* to the local dev API server (npm run dev:api).
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
