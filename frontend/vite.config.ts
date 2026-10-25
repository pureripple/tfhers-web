import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // management (8081) — more specific prefixes first
      '/api/admin': { target: 'http://127.0.0.1:8081', changeOrigin: true },
      '/api/user-management': { target: 'http://127.0.0.1:8081', changeOrigin: true },
      '/api/user': { target: 'http://127.0.0.1:8081', changeOrigin: true },
      '/api/profile': { target: 'http://127.0.0.1:8081', changeOrigin: true },
      // articles CRUD/pin live on management; app 8080 only proxies a subset
      '/api/articles': { target: 'http://127.0.0.1:8081', changeOrigin: true },
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
})
