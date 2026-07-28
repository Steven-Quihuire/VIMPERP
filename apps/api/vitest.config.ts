import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/features/identity/application/**/*.ts',
        'src/features/identity/presentation/**/*.ts',
        'src/features/companies/application/**/*.ts',
        'src/features/companies/presentation/**/*.ts',
        'src/features/admin/application/**/*.ts',
        'src/features/admin/presentation/**/*.ts',
      ],
      exclude: ['**/*.test.ts'],
      thresholds: {
        lines: 80,
      },
    },
  },
});
