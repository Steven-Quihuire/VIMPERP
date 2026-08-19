import { describe, expect, it } from 'vitest';

import {
  assertValidEmployeeDocument,
  assertValidEmployeeIdentity,
} from '../employees';

describe('employee document validation', () => {
  it('accepts valid Ecuadorian documents and rejects invalid ones', () => {
    expect(() =>
      assertValidEmployeeDocument('cedula', '1710034065'),
    ).not.toThrow();
    expect(() =>
      assertValidEmployeeDocument('ruc', '1710034065001'),
    ).not.toThrow();
    expect(() =>
      assertValidEmployeeDocument('pasaporte', 'AV1234567'),
    ).not.toThrow();
    expect(() => assertValidEmployeeDocument('cedula', '1710034066')).toThrow(
      'valid Ecuadorian',
    );
    expect(() => assertValidEmployeeDocument('ruc', '1710034065')).toThrow(
      'must be',
    );
  });

  it('keeps documents optional when creating an employee', () => {
    expect(() =>
      assertValidEmployeeIdentity({
        fullName: 'Employee',
        documentType: null,
        documentNumber: null,
        email: null,
        employmentStatus: 'active',
        hiredAt: null,
      }),
    ).not.toThrow();
  });
});
