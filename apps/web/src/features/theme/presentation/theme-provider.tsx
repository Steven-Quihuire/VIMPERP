import {
  useEffect,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';

import { useAuthStore } from '../../auth/infrastructure/auth-store';
import { needsCompanyOnboarding } from '../../onboarding/domain/onboarding';
import { usePalettePreference } from '../../onboarding/presentation/use-onboarding';
import {
  applyPaletteToDocument,
  defaultPaletteId,
  resolvePaletteId,
} from '../domain/palette';
import { ThemeContext } from './theme-context';

export const ThemeProvider = ({
  apiBaseUrl,
  children,
}: {
  apiBaseUrl?: string;
  children: ReactNode;
}) => {
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const canReadSavedPreference =
    Boolean(session) &&
    location.pathname === '/dashboard' &&
    !needsCompanyOnboarding(session);
  const palettePreference = usePalettePreference(apiBaseUrl, canReadSavedPreference);
  const paletteId = session
    ? resolvePaletteId(palettePreference.data?.paletteId)
    : defaultPaletteId;

  useEffect(() => {
    applyPaletteToDocument(paletteId);
  }, [paletteId]);

  return (
    <ThemeContext.Provider value={{ paletteId }}>{children}</ThemeContext.Provider>
  );
};
