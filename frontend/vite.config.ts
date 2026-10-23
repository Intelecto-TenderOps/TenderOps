import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': { target: 'https://localhost:7043', secure: false }, '/auth': { target: 'https://localhost:7043', secure: false } } },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.ts', include: ['src/**/*.test.{ts,tsx}'] },
});
