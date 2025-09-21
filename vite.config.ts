import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  define: {
    // Set production API URL if not provided via environment
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://chat-bot-4oy4.onrender.com/api' 
        : 'http://localhost:5000/api')
    ),
  },
});
