// Local acceptance only: serve the built SPA and proxy /api + /media to the
// Django server so the frontend and its uploaded media share one origin
// (as they do in production). Not used by the app build.
import { defineConfig } from 'vite'

const API = process.env.PREVIEW_API_ORIGIN || 'http://127.0.0.1:8011'

export default defineConfig({
  preview: {
    port: 4319,
    strictPort: true,
    host: '127.0.0.1',
    proxy: {
      '/api': { target: API, changeOrigin: true },
      '/media': { target: API, changeOrigin: true },
    },
  },
})
