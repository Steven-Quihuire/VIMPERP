import { describe, expect, it } from 'vitest';

import { getFriendlyTimesheetError } from '../friendly-timesheet-error';

describe('friendly timesheet error', () => {
  it('maps typed timesheet codes to actionable Spanish messages', () => {
    expect(getFriendlyTimesheetError('TIMESHEET_ENTRY_CONFLICT')).toContain('Ya existe una carga');
    expect(getFriendlyTimesheetError('TIMESHEET_LOCKED')).toContain('ya no está en borrador');
    expect(getFriendlyTimesheetError('TIMESHEET_SELF_APPROVAL')).toContain('No podés aprobar');
  });

  it('falls back to a generic message when the code is unknown', () => {
    expect(getFriendlyTimesheetError('SOMETHING_ELSE')).toBe(
      'No se pudo completar la acción sobre el registro de horas. Intentá nuevamente.',
    );
    expect(getFriendlyTimesheetError()).toBe(
      'No se pudo completar la acción sobre el registro de horas. Intentá nuevamente.',
    );
  });
});
