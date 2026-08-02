import { describe, expect, it } from 'vitest';

import {
  isValidEcuadorianCedula,
  isValidEcuadorianLegalIdentifier,
  isValidEcuadorianMobile,
  isValidEcuadorianRuc,
} from './onboarding';

describe('Ecuadorian legal identifiers', () => {
  it('validates an Ecuadorian cedula', () => {
    expect(isValidEcuadorianCedula('1710034065')).toBe(true);
    expect(isValidEcuadorianCedula('1710034066')).toBe(false);
    expect(isValidEcuadorianCedula('2510034065')).toBe(false);
  });

  it('validates natural-person RUCs derived from a cedula', () => {
    expect(isValidEcuadorianRuc('1710034065001')).toBe(true);
    expect(isValidEcuadorianRuc('1710034065000')).toBe(false);
  });

  it('validates private-company and public-entity RUCs with modulo 11', () => {
    expect(isValidEcuadorianRuc('1790012344001')).toBe(true);
    expect(isValidEcuadorianRuc('1760001551001')).toBe(true);
    expect(isValidEcuadorianRuc('1790012345001')).toBe(false);
  });

  it('accepts either a cedula or a RUC as a legal identifier', () => {
    expect(isValidEcuadorianLegalIdentifier('1710034065')).toBe(true);
    expect(isValidEcuadorianLegalIdentifier('1710034065001')).toBe(true);
    expect(isValidEcuadorianLegalIdentifier('123')).toBe(false);
  });

  it('validates only Ecuadorian mobile numbers in domestic format', () => {
    expect(isValidEcuadorianMobile('0991234567')).toBe(true);
    expect(isValidEcuadorianMobile('098765432')).toBe(false);
    expect(isValidEcuadorianMobile('0991234568')).toBe(true);
    expect(isValidEcuadorianMobile('09912345678')).toBe(false);
  });
});
