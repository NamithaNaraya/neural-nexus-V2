import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('echarts') || id.includes('recharts')) {
            return 'charts-vendor';
          }
          if (id.includes('jspdf') || id.includes('xlsx') || id.includes('html2canvas')) {
            return 'export-vendor';
          }
          if (id.includes('framer-motion')) {
            return 'motion-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
        proxyTimeout: 300000, // 5 minutes
        timeout: 300000,      // 5 minutes
        // Enable streaming: tell http-proxy not to buffer responses
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // For streaming endpoints, ensure no accept-encoding so proxy doesn't buffer
            if (req.url?.includes('stream-answer')) {
              proxyReq.setHeader('Accept-Encoding', 'identity');
            }
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            if (req.url?.includes('stream-answer')) {
              // Disable buffering for streaming responses
              proxyRes.headers['cache-control'] = 'no-cache, no-store, must-revalidate';
              proxyRes.headers['x-accel-buffering'] = 'no';
              delete proxyRes.headers['content-length'];
            }
          });
        },
      },
    },
  },
})
