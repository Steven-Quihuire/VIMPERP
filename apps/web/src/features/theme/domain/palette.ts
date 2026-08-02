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

export const defaultPaletteId: PaletteId = 'mono';

export const paletteTokens: Record<PaletteId, PaletteTokens> = {
  mono: {
    surface: '#f5f5f5',
    background: '#ffffff',
    border: '#d4d4d4',
    accent: '#171717',
    text: '#171717',
  },
  ocean: {
    surface: '#f5f5f5',
    background: '#ffffff',
    border: '#e5e5e5',
    accent: '#171717',
    text: '#171717',
  },
  forest: {
    surface: '#e7f6eb',
    background: '#f5fcf6',
    border: '#bddac5',
    accent: '#2f8f57',
    text: '#163525',
  },
  violet: {
    surface: '#f4eaff',
    background: '#fcf8ff',
    border: '#dec8ff',
    accent: '#9b5de5',
    text: '#40235f',
  },
  sunset: {
    surface: '#ffeddc',
    background: '#fff7f1',
    border: '#f3c8a5',
    accent: '#ef7d32',
    text: '#6c3317',
  },
  midnight: {
    surface: '#e7edf7',
    background: '#f3f6fb',
    border: '#c2cede',
    accent: '#39587c',
    text: '#1b2840',
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
  htmlElement.style.setProperty('--background', tokens.background);
  htmlElement.style.setProperty('--card', tokens.background);
  htmlElement.style.setProperty('--popover', tokens.background);
  htmlElement.style.setProperty('--foreground', tokens.text);
  htmlElement.style.setProperty('--card-foreground', tokens.text);
  htmlElement.style.setProperty('--popover-foreground', tokens.text);
  htmlElement.style.setProperty('--border', tokens.border);
  htmlElement.style.setProperty('--input', tokens.border);
  htmlElement.style.setProperty('--ring', tokens.accent);
  htmlElement.style.setProperty('--accent', tokens.surface);
  htmlElement.style.setProperty('--accent-foreground', tokens.text);
  htmlElement.style.setProperty('--primary', tokens.accent);
  htmlElement.style.setProperty('--primary-foreground', '#ffffff');
  htmlElement.style.setProperty('--muted', tokens.surface);
  htmlElement.style.setProperty('--muted-foreground', tokens.text);
  htmlElement.style.setProperty('--color-surface', tokens.surface);
  htmlElement.style.setProperty('--color-background', tokens.background);
  htmlElement.style.setProperty('--color-border', tokens.border);
  htmlElement.style.setProperty('--color-accent', tokens.accent);
  htmlElement.style.setProperty('--color-text', tokens.text);
};
