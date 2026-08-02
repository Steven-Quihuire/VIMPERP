import { create } from 'zustand';

import type { AuthSession } from '../../auth/domain/auth';
import {
  createInitialOnboardingDraft,
  normalizeServices,
  onboardingSteps,
  type OnboardingDraft,
  validateOnboardingStep,
} from '../domain/onboarding';

const onboardingStorageKeyPrefix = 'vimcore:onboarding:';

const getOnboardingStorageKey = (userId: string) =>
  `${onboardingStorageKeyPrefix}${userId}`;

const getStorage = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const clampStepIndex = (currentStepIndex: number) =>
  Math.min(onboardingSteps.length - 1, Math.max(0, currentStepIndex));

const readPersistedOnboarding = (userId: string) => {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const rawSnapshot = storage.getItem(getOnboardingStorageKey(userId));

  if (!rawSnapshot) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSnapshot) as {
      draft?: OnboardingDraft;
      currentStepIndex?: number;
    };

    if (!parsed.draft || typeof parsed.currentStepIndex !== 'number') {
      return null;
    }

    return {
      draft: parsed.draft,
      currentStepIndex: clampStepIndex(parsed.currentStepIndex),
    };
  } catch {
    return null;
  }
};

const persistOnboarding = (
  userId: string | null,
  draft: OnboardingDraft,
  currentStepIndex: number,
) => {
  const storage = getStorage();

  if (!storage || !userId) {
    return;
  }

  storage.setItem(
    getOnboardingStorageKey(userId),
    JSON.stringify({
      draft,
      currentStepIndex: clampStepIndex(currentStepIndex),
    }),
  );
};

const clearPersistedOnboarding = (userId: string | null) => {
  const storage = getStorage();

  if (!storage || !userId) {
    return;
  }

  storage.removeItem(getOnboardingStorageKey(userId));
};

const mergeDraftWithSessionDefaults = (
  session: AuthSession | null,
  persistedDraft?: OnboardingDraft,
): OnboardingDraft => {
  const initialDraft = createInitialOnboardingDraft(session);

  if (!persistedDraft) {
    return initialDraft;
  }

  return {
    ...initialDraft,
    ...persistedDraft,
    services: normalizeServices(
      Array.isArray(persistedDraft.services)
        ? persistedDraft.services
        : persistedDraft.servicesInput.split(','),
    ),
    companyName:
      persistedDraft.companyName.trim().length > 0
        ? persistedDraft.companyName
        : initialDraft.companyName,
    contactEmail:
      persistedDraft.contactEmail.trim().length > 0
        ? persistedDraft.contactEmail
        : initialDraft.contactEmail,
    country:
      persistedDraft.country.trim().length > 0
        ? persistedDraft.country
        : initialDraft.country,
    servicesInput: '',
  };
};

type OnboardingStoreState = {
  currentUserId: string | null;
  draft: OnboardingDraft;
  currentStepIndex: number;
  error: string | null;
  updateDraft: (partial: Partial<OnboardingDraft>) => void;
  goToPreviousStep: () => void;
  goToNextStep: () => boolean;
  hydrate: (session: AuthSession) => void;
  reset: (session: AuthSession | null) => void;
};

export const useOnboardingStore = create<OnboardingStoreState>((set, get) => ({
  currentUserId: null,
  draft: createInitialOnboardingDraft(null),
  currentStepIndex: 0,
  error: null,
  updateDraft: (partial) =>
    set((state) => {
      const nextState = {
        draft: { ...state.draft, ...partial },
        error: null,
      };

      persistOnboarding(
        state.currentUserId,
        nextState.draft,
        state.currentStepIndex,
      );

      return nextState;
    }),
  goToPreviousStep: () =>
    set((state) => {
      const nextState = {
        currentStepIndex: clampStepIndex(state.currentStepIndex - 1),
        error: null,
      };

      persistOnboarding(
        state.currentUserId,
        state.draft,
        nextState.currentStepIndex,
      );

      return nextState;
    }),
  goToNextStep: () => {
    const state = get();
    const currentStep: (typeof onboardingSteps)[number] =
      onboardingSteps[state.currentStepIndex] ?? 'account';
    const error = validateOnboardingStep(currentStep, state.draft);

    if (error) {
      set({ error });
      return false;
    }

    const nextStepIndex = clampStepIndex(state.currentStepIndex + 1);

    persistOnboarding(state.currentUserId, state.draft, nextStepIndex);

    set({
      currentStepIndex: nextStepIndex,
      error: null,
    });

    return true;
  },
  hydrate: (session) => {
    const persistedSnapshot = readPersistedOnboarding(session.user.id);
    const nextDraft = mergeDraftWithSessionDefaults(
      session,
      persistedSnapshot?.draft,
    );
    const nextStepIndex = persistedSnapshot?.currentStepIndex ?? 0;

    persistOnboarding(session.user.id, nextDraft, nextStepIndex);

    set({
      currentUserId: session.user.id,
      draft: nextDraft,
      currentStepIndex: nextStepIndex,
      error: null,
    });
  },
  reset: (session) =>
    set((state) => {
      clearPersistedOnboarding(state.currentUserId);

      return {
        currentUserId: session?.user.id ?? null,
        draft: createInitialOnboardingDraft(session),
        currentStepIndex: 0,
        error: null,
      };
    }),
}));
