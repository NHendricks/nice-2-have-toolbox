import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  root: './src',
  server: { host: '0.0.0.0' },
  build: {
    outDir: '../dist',
    minify: true,
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
})
