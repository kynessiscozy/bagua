import { defineConfig } from 'vite'

export default defineConfig({
  base: '/bagua/',
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    port: 3000,
    open: true
  }
})