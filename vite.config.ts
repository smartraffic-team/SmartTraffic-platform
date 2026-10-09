import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: 'imgs',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    maxWorkers: 1,
  },
});
