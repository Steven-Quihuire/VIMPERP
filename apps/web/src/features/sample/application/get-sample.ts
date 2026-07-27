import type { Sample, SampleRepository } from '../domain/sample';

export const getSample = (repository: SampleRepository): Sample => repository.getSample();
