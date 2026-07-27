import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import type { AuthSession } from '../../auth/domain/auth';
import {
  normalizeServices,
  onboardingSteps,
  paletteValues,
} from '../domain/onboarding';
import { useOnboardingStore } from '../infrastructure/onboarding-store';
import { useCreateCompany } from './use-onboarding';

export const OnboardingPage = ({
  apiBaseUrl,
  session,
}: {
  apiBaseUrl?: string;
  session: AuthSession;
}) => {
  const navigate = useNavigate();
  const draft = useOnboardingStore((state) => state.draft);
  const currentStepIndex = useOnboardingStore((state) => state.currentStepIndex);
  const error = useOnboardingStore((state) => state.error);
  const updateDraft = useOnboardingStore((state) => state.updateDraft);
  const goToNextStep = useOnboardingStore((state) => state.goToNextStep);
  const goToPreviousStep = useOnboardingStore((state) => state.goToPreviousStep);
  const reset = useOnboardingStore((state) => state.reset);
  const createCompany = useCreateCompany(apiBaseUrl);
  const isSubmittingRef = useRef(false);

  const currentStep = onboardingSteps[currentStepIndex];

  const finishOnboarding = async () => {
    if (isSubmittingRef.current || createCompany.isPending) {
      return;
    }

    if (!goToNextStep()) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      await createCompany.mutateAsync({
        name: draft.companyName,
        legalIdentifier: draft.legalIdentifier,
        services: normalizeServices(draft.servicesInput),
        address: {
          country: draft.country,
          city: draft.city,
          exactLocation: draft.exactLocation,
        },
        contact: {
          phone: draft.contactPhone,
          email: draft.contactEmail,
        },
        paletteId: draft.paletteId,
      });

      reset(session);
      void navigate('/dashboard');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <main>
      <h1>Company onboarding</h1>
      <p>
        Step {currentStepIndex + 1} of {onboardingSteps.length}
      </p>
      <p>Signed in as {session.user.email}</p>

      {currentStep === 'account' ? (
        <label>
          <span>Company name</span>
          <input
            aria-label="Company name"
            value={draft.companyName}
            onChange={(event) => updateDraft({ companyName: event.target.value })}
          />
        </label>
      ) : null}

      {currentStep === 'legal' ? (
        <label>
          <span>Legal or tax identifier</span>
          <input
            aria-label="Legal or tax identifier"
            value={draft.legalIdentifier}
            onChange={(event) => updateDraft({ legalIdentifier: event.target.value })}
          />
        </label>
      ) : null}

      {currentStep === 'services' ? (
        <label>
          <span>Services</span>
          <input
            aria-label="Services"
            value={draft.servicesInput}
            onChange={(event) => updateDraft({ servicesInput: event.target.value })}
          />
        </label>
      ) : null}

      {currentStep === 'address' ? (
        <>
          <label>
            <span>Country</span>
            <input
              aria-label="Country"
              value={draft.country}
              onChange={(event) => updateDraft({ country: event.target.value })}
            />
          </label>
          <label>
            <span>City</span>
            <input
              aria-label="City"
              value={draft.city}
              onChange={(event) => updateDraft({ city: event.target.value })}
            />
          </label>
          <label>
            <span>Exact location</span>
            <input
              aria-label="Exact location"
              value={draft.exactLocation}
              onChange={(event) => updateDraft({ exactLocation: event.target.value })}
            />
          </label>
        </>
      ) : null}

      {currentStep === 'contact' ? (
        <>
          <label>
            <span>Contact phone</span>
            <input
              aria-label="Contact phone"
              value={draft.contactPhone}
              onChange={(event) => updateDraft({ contactPhone: event.target.value })}
            />
          </label>
          <label>
            <span>Contact email</span>
            <input
              aria-label="Contact email"
              value={draft.contactEmail}
              onChange={(event) => updateDraft({ contactEmail: event.target.value })}
            />
          </label>
          <label>
            <span>Palette</span>
            <select
              aria-label="Palette"
              value={draft.paletteId}
              onChange={(event) =>
                updateDraft({
                  paletteId: event.target.value as (typeof paletteValues)[number],
                })
              }
            >
              {paletteValues.map((palette) => (
                <option key={palette} value={palette}>
                  {palette}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      {error ? <p>{error}</p> : null}
      {createCompany.isError ? <p>Unable to create company.</p> : null}

      <div>
        <button
          type="button"
          onClick={goToPreviousStep}
          disabled={currentStepIndex === 0}
        >
          Back
        </button>
        {currentStepIndex === onboardingSteps.length - 1 ? (
          <button
            type="button"
            onClick={() => void finishOnboarding()}
            disabled={createCompany.isPending}
          >
            {createCompany.isPending ? 'Creating company...' : 'Create company'}
          </button>
        ) : (
          <button type="button" onClick={goToNextStep}>
            Continue
          </button>
        )}
      </div>
    </main>
  );
};
