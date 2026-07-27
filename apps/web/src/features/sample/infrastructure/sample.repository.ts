import type { SampleRepository } from '../domain/sample';

export const createSampleRepository = (): SampleRepository => ({
  getSample: () => ({ title: 'Sample' }),
});
