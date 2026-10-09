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
        name: 'Taxman – Australian Money Calculators',
        short_name: 'Taxman',
        description:
          'Ad-free Australian calculators for take-home pay, tax, HELP/HECS and super, contract vs permanent, mortgages and novated leases, with every figure sourced. Runs in your browser.',
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
