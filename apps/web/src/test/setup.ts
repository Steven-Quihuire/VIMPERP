import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

import { useAuthStore } from '../features/auth/infrastructure/auth-store';
import { useOnboardingStore } from '../features/onboarding/infrastructure/onboarding-store';

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key) => store.get(key) ?? null,
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
};

if (!globalThis.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
  });
}

if (!globalThis.ResizeObserver) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverMock,
    configurable: true,
  });
}

afterEach(() => {
  useAuthStore.getState().clearSession();
  useOnboardingStore.getState().reset(null);
  globalThis.localStorage?.clear();
});
