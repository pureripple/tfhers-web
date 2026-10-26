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
      '/api/admin': { target: 'http://127.0.0.1:8081', changeOrigin: true },
      '/api/user-management': { target: 'http://127.0.0.1:8081', changeOrigin: true },
      '/api/user': { target: 'http://127.0.0.1:8081', changeOrigin: true },
      '/api/profile': { target: 'http://127.0.0.1:8081', changeOrigin: true },
      '/api/articles': { target: 'http://127.0.0.1:8081', changeOrigin: true },
      '/api/feedback': { target: 'http://127.0.0.1:8081', changeOrigin: true },
      '/api/combos': { target: 'http://127.0.0.1:8081', changeOrigin: true },
      '/api/file': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
      },
      '/api/characters': { target: 'http://127.0.0.1:8081', changeOrigin: true },
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
})
