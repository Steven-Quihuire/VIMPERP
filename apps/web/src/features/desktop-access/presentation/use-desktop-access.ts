import { isDesktop } from '../domain/desktop-access';

const readCoarsePointer = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(pointer: coarse)').matches;
};

export const useDesktopAccess = () => {
  if (typeof window === 'undefined') {
    return true;
  }

  return isDesktop(window.navigator.userAgent, readCoarsePointer());
};
