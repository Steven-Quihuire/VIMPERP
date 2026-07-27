import { useState } from 'react';

import {
  paletteValues,
  type PaletteId,
} from '../../onboarding/domain/onboarding';
import {
  usePalettePreference,
  useUpdatePalettePreference,
} from '../../onboarding/presentation/use-onboarding';
import { useLogout } from './use-auth';

export const DashboardPage = ({
  email,
  apiBaseUrl,
}: {
  email: string;
  apiBaseUrl?: string;
}) => {
  const logout = useLogout(apiBaseUrl);
  const palettePreference = usePalettePreference(apiBaseUrl);
  const updatePalettePreference = useUpdatePalettePreference(apiBaseUrl);
  const [draftPaletteId, setDraftPaletteId] = useState<PaletteId>('ocean');

  const selectedPaletteId =
    draftPaletteId === 'ocean'
      ? palettePreference.data?.paletteId ?? draftPaletteId
      : draftPaletteId;

  return (
    <main>
      <h1>ERP dashboard</h1>
      <p>{email}</p>
      <label>
        <span>Palette preference</span>
        <select
          aria-label="Palette preference"
          value={selectedPaletteId}
          onChange={(event) => setDraftPaletteId(event.target.value as PaletteId)}
        >
          {paletteValues.map((palette) => (
            <option key={palette} value={palette}>
              {palette}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => updatePalettePreference.mutate(draftPaletteId)}
      >
        Save palette
      </button>
      <button type="button" onClick={() => logout.mutate()}>
        Sign out
      </button>
    </main>
  );
};
