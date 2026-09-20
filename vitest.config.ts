import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false, // Run test files sequentially to ensure clean database transactions and zero socket congestion
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
