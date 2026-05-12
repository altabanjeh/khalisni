import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Charting library — only used in reports pages
          if (id.includes('recharts') || id.includes('d3-')) return 'chunk-charts'
          // Form library
          if (id.includes('react-hook-form')) return 'chunk-forms'
          // React core
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'chunk-react'
          // Router
          if (id.includes('react-router')) return 'chunk-router'
          // HTTP client
          if (id.includes('node_modules/axios/')) return 'chunk-axios'
          // Icon set — large; split from app code
          if (id.includes('lucide-react')) return 'chunk-icons'
          // Everything else in node_modules goes to vendor
          if (id.includes('node_modules/')) return 'chunk-vendor'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
})
