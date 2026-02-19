import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Removed: chunkSizeWarningLimit: 2000 (was masking oversized chunks)
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — shared by all pages
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // React Query — shared by all data-fetching components
          'vendor-query': ['@tanstack/react-query'],
          // Charts — only loaded by pages that import recharts
          'vendor-charts': ['recharts'],
        }
      }
    }
  }
})
