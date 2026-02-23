import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/lib/availability/calculator.ts',
        'src/lib/utils/encryption.ts',
        'src/lib/rate-limit/index.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
      },
    },
    env: {
      ENCRYPTION_KEY: 'test-encryption-key-for-vitest-32chars!!',
    },
  },
});
