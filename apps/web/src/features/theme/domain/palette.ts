import {
  paletteValues,
  type PaletteId,
} from '../../onboarding/domain/onboarding';

type PaletteTokens = {
  surface: string;
  background: string;
  border: string;
  accent: string;
  text: string;
};

export const defaultPaletteId: PaletteId = 'ocean';

export const paletteTokens: Record<PaletteId, PaletteTokens> = {
  ocean: {
    surface: '#e0f2fe',
    background: '#f8fbff',
    border: '#7dd3fc',
    accent: '#0284c7',
    text: '#082f49',
  },
  forest: {
    surface: '#dcfce7',
    background: '#f6fff8',
    border: '#86efac',
    accent: '#15803d',
    text: '#14532d',
  },
  violet: {
    surface: '#f3e8ff',
    background: '#fcf8ff',
    border: '#d8b4fe',
    accent: '#7c3aed',
    text: '#4c1d95',
  },
  sunset: {
    surface: '#ffedd5',
    background: '#fff8f1',
    border: '#fdba74',
    accent: '#ea580c',
    text: '#7c2d12',
  },
  midnight: {
    surface: '#e2e8f0',
    background: '#f8fafc',
    border: '#94a3b8',
    accent: '#334155',
    text: '#0f172a',
  },
};

export const resolvePaletteId = (paletteId?: string | null): PaletteId => {
  if (paletteId && paletteValues.includes(paletteId as PaletteId)) {
    return paletteId as PaletteId;
  }

  return defaultPaletteId;
};

export const applyPaletteToDocument = (paletteId: PaletteId) => {
  const htmlElement = document.documentElement;
  const tokens = paletteTokens[paletteId];

  htmlElement.dataset.palette = paletteId;
  htmlElement.style.setProperty('--color-surface', tokens.surface);
  htmlElement.style.setProperty('--color-background', tokens.background);
  htmlElement.style.setProperty('--color-border', tokens.border);
  htmlElement.style.setProperty('--color-accent', tokens.accent);
  htmlElement.style.setProperty('--color-text', tokens.text);
};
