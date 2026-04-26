import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['cake.svg'],
      manifest: {
        name: 'CakeZake Orders',
        short_name: 'CakeZake',
        description: 'CakeZake Order Management System',
        theme_color: '#ff2d55',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/dashboard',
        icons: [
          { src: 'cake.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Do not precache HTML: old SW + cached index → broken app after deploy (stale chunk URLs).
        globPatterns: ['**/*.{js,css,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        // Default plugin navigateFallback precaches index.html — stale shell after deploy.
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https?.*\/api\/auth\/verify/,
            handler: 'NetworkFirst',
            options: { cacheName: 'auth-cache', networkTimeoutSeconds: 5 },
          },
          {
            urlPattern: /^https?.*\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 8 },
          },
          {
            urlPattern: /^https?.*\/uploads\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'uploads-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts':  ['recharts'],
          'vendor-socket':  ['socket.io-client'],
          'vendor-forms':   ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-ui':      ['lucide-react', 'react-hot-toast'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
