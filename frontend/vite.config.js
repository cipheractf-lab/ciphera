import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: ['es2015', 'chrome63', 'safari11.1', 'firefox67', 'edge79'],
      cssTarget: ['chrome63', 'safari11.1', 'firefox67', 'edge79'],
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor libraries in separate chunk
            if (id.includes('node_modules')) {
              // React must be in its own chunk and loaded first
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              // React Router after React
              if (id.includes('react-router')) {
                return 'vendor-router';
              }
              // Framer Motion depends on React
              if (id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              if (id.includes('axios')) {
                return 'vendor-axios';
              }
              if (id.includes('socket.io')) {
                return 'vendor-socket';
              }
              return 'vendor-other';
            }
            
            // Admin routes in separate, obfuscated chunks (only loaded for admins)
            if (id.includes('pages/Admin')) {
              return 'admin-core';
            }
            if (id.includes('pages/PlatformControl') || id.includes('pages/PlatformReset')) {
              return 'admin-platform';
            }
            if (id.includes('pages/Analytics') || id.includes('pages/AdminSubmissions')) {
              return 'admin-analytics';
            }
            if (id.includes('pages/CreateChallenge') || id.includes('pages/EditChallenge')) {
              return 'admin-challenges';
            }
            
            // User pages in separate chunks
            if (id.includes('pages/')) {
              return 'pages';
            }
            
            // Components in separate chunk
            if (id.includes('components/')) {
              return 'components';
            }
          },
          // Obfuscate chunk names in production
          chunkFileNames: (chunkInfo) => {
            const name = chunkInfo.name;
            // Keep vendor chunks named for caching, obfuscate admin chunks
            if (name.startsWith('vendor-')) {
              return `assets/${name}-[hash].js`;
            }
            if (name.startsWith('admin-')) {
              // Use hash-based naming to obscure admin functionality
              return `assets/[hash].js`;
            }
            return 'assets/[name]-[hash].js';
          }
        }
      }
    },
    server: {
      port: 5173,
      host: true, // Listen on all addresses
      strictPort: true,
      cors: true,
      proxy: {
        '/api': {
          target: (env.VITE_API_URL && env.VITE_API_URL !== '/') ? env.VITE_API_URL : 'http://localhost:10000',
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          }
        }
      }
    }
  }
})
