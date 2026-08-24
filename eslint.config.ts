import { baseConfig } from './packages/eslint-config/base';
import { reactConfig } from './packages/eslint-config/react';

export default [
  {
    // Root-level scratch/debug files are not part of any tsconfig project;
    // type-aware rules cannot lint them.
    ignores: ['mini-test.mts', 'repro-form.mts', 'sum.ts', 'sum.test.ts'],
  },
  ...baseConfig,
  ...reactConfig,
];
