import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    exclude: ['@supabase/phoenix'],   // 👈 ADD THIS
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['@supabase/phoenix'], // 👈 ADD THIS
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})