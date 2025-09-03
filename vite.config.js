import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // serve assets relative to index.html
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils')
    }
  },
  server: {
    port: 5173,
    open: true,
    fs: {
      // Allow serving files from parent directories
      allow: ['..']
    },
    // Proxy Netlify Functions during local Vite development
    // During local dev, send API calls to local FastAPI server on port 8000
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // Forward both GET and POST, strip `/api` prefix
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.method === 'POST' && req.body) {
              const bodyData = JSON.stringify(req.body)
              proxyReq.setHeader('Content-Type', 'application/json')
              proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))
              proxyReq.write(bodyData)
            }
          })
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Simple naming to avoid path issues
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash].[ext]'
      }
    },
    // Compatible settings for Netlify
    target: ['es2015'],
    minify: 'esbuild',
    cssCodeSplit: false
  }
})
