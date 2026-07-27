import {
  createContext,
  useContext,
} from 'react';

import { defaultPaletteId } from '../domain/palette';

export const ThemeContext = createContext({
  paletteId: defaultPaletteId,
});

export const usePalette = () => useContext(ThemeContext);
