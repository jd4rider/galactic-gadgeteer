import { defineConfig } from 'vite'

export default defineConfig({
  // Relative assets keep the game portable between GitHub Pages project paths,
  // the Little Joy subdomain and an embedded arcade frame.
  base: './',
  server: { port: 5182, host: '127.0.0.1' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1800,
  },
})
