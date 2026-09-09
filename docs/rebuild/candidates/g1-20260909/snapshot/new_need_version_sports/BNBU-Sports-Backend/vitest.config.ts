import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  include: ['tests/**/*.test.ts'], fileParallelism: false, maxWorkers: 1,
  testTimeout: 15000, hookTimeout: 30000, watch: false
}});
