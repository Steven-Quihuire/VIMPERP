import { create } from 'zustand';

import { getSample } from '../application/get-sample';
import { createSampleRepository } from './sample.repository';

type SampleState = {
  title: string;
};

const initialSample = getSample(createSampleRepository());

export const useSampleStore = create<SampleState>(() => ({
  title: initialSample.title,
}));
