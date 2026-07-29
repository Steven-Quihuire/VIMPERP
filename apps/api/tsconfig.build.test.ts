import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const readBuildConfig = async () => {
  const filePath = path.resolve(__dirname, 'tsconfig.build.json');
  const fileContents = await readFile(filePath, 'utf8');

  return JSON.parse(fileContents) as {
    exclude?: string[];
    include?: string[];
  };
};

describe('apps/api tsconfig.build.json', () => {
  it('excludes migration test helpers from the production build', async () => {
    const config = await readBuildConfig();

    expect(config.include).toEqual(['src/**/*.ts']);
    expect(config.exclude).toContain('src/**/*.test.ts');
    expect(config.exclude).toContain('src/**/__tests__/**/*.ts');
  });
});
