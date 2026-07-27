export type Sample = {
  title: string;
};

export type SampleRepository = {
  getSample: () => Sample;
};
