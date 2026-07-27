import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { SampleCard } from '../features/sample/presentation/sample-card';
import { useSampleStore } from '../features/sample/infrastructure/sample.store';

const queryClient = new QueryClient();

export const App = () => {
  const title = useSampleStore((state) => state.title);

  return (
    <QueryClientProvider client={queryClient}>
      <main>
        <SampleCard title={title} />
      </main>
    </QueryClientProvider>
  );
};
