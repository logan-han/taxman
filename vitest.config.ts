import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Whole app, so the Codecov number means what it looks like. main.tsx is
      // the createRoot entry point and assets are binaries.
      include: ['src/**'],
      exclude: ['src/main.tsx', 'src/assets/**'],
    },
  },
});
