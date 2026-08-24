const fallbackFriendlyTimesheetError =
  'No se pudo completar la acción sobre el registro de horas. Intentá nuevamente.';

const friendlyTimesheetErrors: Record<string, string> = {
  TIMESHEET_ENTRY_CONFLICT:
    'Ya existe una carga para esa fecha y tarea. Revisá las horas o editá la entrada existente.',
  TIMESHEET_INVALID_STATUS_TRANSITION:
    'La acción ya no está disponible para el estado actual del período.',
  TIMESHEET_LOCKED:
    'Este período ya no está en borrador. Actualizá la vista antes de seguir.',
  TIMESHEET_PERIOD_OVERLAP:
    'Ya existe un período de horas que se superpone para esa asignación.',
  TIMESHEET_REJECTION_REASON_REQUIRED:
    'Ingresá un motivo antes de rechazar el período.',
  TIMESHEET_SELF_APPROVAL:
    'No podés aprobar un período que vos mismo enviaste.',
  TIMESHEET_VALIDATION:
    'Revisá los datos ingresados e intentá nuevamente.',
};

export const getFriendlyTimesheetError = (code?: string | null) => {
  if (!code) {
    return fallbackFriendlyTimesheetError;
  }

  return friendlyTimesheetErrors[code] ?? fallbackFriendlyTimesheetError;
};
