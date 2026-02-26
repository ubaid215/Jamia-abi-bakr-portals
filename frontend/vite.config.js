import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // ── Vitest configuration ───────────────────────────────────────────────────
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    css: false,
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/services/**', 'src/contexts/**', 'src/pages/**'],
      exclude: ['src/tests/**', 'node_modules/**'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['recharts'],
        }
      }
    }
  }
})
