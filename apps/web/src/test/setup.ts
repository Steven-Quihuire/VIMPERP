import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

import { useAuthStore } from '../features/auth/infrastructure/auth-store';
import { useOnboardingStore } from '../features/onboarding/infrastructure/onboarding-store';

afterEach(() => {
  useAuthStore.getState().clearSession();
  useOnboardingStore.getState().reset(null);
});
