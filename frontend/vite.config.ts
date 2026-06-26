import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'SIGUVH — Université Virtuelle Hybride',
        short_name: 'SIGUVH',
        description: 'Système Intégré de Gestion d\'Université Virtuelle Hybride',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        categories: ['education', 'productivity'],
        shortcuts: [
          { name: 'Dashboard', url: '/dashboard', description: 'Tableau de bord' },
          { name: 'Étudiants', url: '/students', description: 'Gestion des étudiants' },
          { name: 'LMS', url: '/lms', description: 'Campus virtuel' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /\/api\/v1\/(academic-years|programs|faculties|departments)\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'api-static-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react'
          if (id.includes('@tanstack')) return 'vendor-query'
          if (id.includes('recharts')) return 'vendor-charts'
          if (id.includes('@react-pdf')) return 'vendor-pdf'
          if (id.includes('xlsx') || id.includes('file-saver')) return 'vendor-excel'
          if (id.includes('react-hook-form') || id.includes('zod')) return 'vendor-forms'
          if (id.includes('lucide-react')) return 'vendor-ui'
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/media': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
