import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Taxman – Australian Pay Calculator',
        short_name: 'Taxman',
        description:
          'Ad-free Australian pay calculator: income tax, Medicare levy, HELP/HECS, superannuation and take-home pay, with every figure sourced from the ATO.',
        theme_color: '#00375f',
        background_color: '#f6f8fa',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  build: {
    outDir: 'build',
    sourcemap: false,
  },
});
