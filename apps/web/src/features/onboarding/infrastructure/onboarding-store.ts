import { create } from 'zustand';

import type { AuthSession } from '../../auth/domain/auth';
import {
  createInitialOnboardingDraft,
  onboardingSteps,
  type OnboardingDraft,
  validateOnboardingStep,
} from '../domain/onboarding';

type OnboardingStoreState = {
  draft: OnboardingDraft;
  currentStepIndex: number;
  error: string | null;
  updateDraft: (partial: Partial<OnboardingDraft>) => void;
  goToPreviousStep: () => void;
  goToNextStep: () => boolean;
  reset: (session: AuthSession | null) => void;
};

export const useOnboardingStore = create<OnboardingStoreState>((set, get) => ({
  draft: createInitialOnboardingDraft(null),
  currentStepIndex: 0,
  error: null,
  updateDraft: (partial) =>
    set((state) => ({
      draft: { ...state.draft, ...partial },
      error: null,
    })),
  goToPreviousStep: () =>
    set((state) => ({
      currentStepIndex: Math.max(0, state.currentStepIndex - 1),
      error: null,
    })),
  goToNextStep: () => {
    const state = get();
    const currentStep: (typeof onboardingSteps)[number] =
      onboardingSteps[state.currentStepIndex] ?? 'account';
    const error = validateOnboardingStep(currentStep, state.draft);

    if (error) {
      set({ error });
      return false;
    }

    set({
      currentStepIndex: Math.min(onboardingSteps.length - 1, state.currentStepIndex + 1),
      error: null,
    });

    return true;
  },
  reset: (session) =>
    set({
      draft: createInitialOnboardingDraft(session),
      currentStepIndex: 0,
      error: null,
    }),
}));
