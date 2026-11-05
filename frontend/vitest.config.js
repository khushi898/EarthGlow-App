import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.jsx'],
    setupFiles: ['tests/setup.js'],
    // Tests answer every request themselves, so this address is never contacted.
    env: { VITE_API_URL: 'http://api.invalid/api' }
  }
});
