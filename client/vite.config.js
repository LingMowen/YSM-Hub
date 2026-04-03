import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:51300',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  customLogger: {
    info: (msg) => console.log(msg.replace(/[^\x00-\x7F]/g, '')),
    warn: (msg) => console.warn(msg.replace(/[^\x00-\x7F]/g, '')),
    error: (msg) => console.error(msg.replace(/[^\x00-\x7F]/g, '')),
    clear: () => console.clear(),
    hasWarned: false
  }
})
