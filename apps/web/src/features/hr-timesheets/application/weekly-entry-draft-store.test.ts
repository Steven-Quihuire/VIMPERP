import { beforeEach, describe, expect, it } from 'vitest';

import { useWeeklyEntryDraftStore } from './weekly-entry-draft-store';

describe('weekly-entry-draft-store', () => {
  beforeEach(() => {
    useWeeklyEntryDraftStore.setState({
      drafts: {},
      rejectDialog: { isOpen: false, periodId: null, reason: '' },
    });
  });

  it('buffers drafts by key and can clear them independently', () => {
    useWeeklyEntryDraftStore.getState().setDraft('2026-08-11:payroll', {
      entryId: null,
      entryDate: '2026-08-11',
      hours: '8',
      projectId: '',
      taskLabel: 'Payroll review',
      note: 'Updated payroll incidents',
    });

    expect(useWeeklyEntryDraftStore.getState().drafts).toMatchObject({
      '2026-08-11:payroll': {
        entryDate: '2026-08-11',
        hours: '8',
      },
    });

    useWeeklyEntryDraftStore.getState().clearDraft('2026-08-11:payroll');

    expect(useWeeklyEntryDraftStore.getState().drafts).toEqual({});
  });

  it('controls the reject dialog independently from the draft buffer', () => {
    useWeeklyEntryDraftStore.getState().openRejectDialog('period-1');
    useWeeklyEntryDraftStore.getState().setRejectReason('Faltan comprobantes');

    expect(useWeeklyEntryDraftStore.getState().rejectDialog).toEqual({
      isOpen: true,
      periodId: 'period-1',
      reason: 'Faltan comprobantes',
    });

    useWeeklyEntryDraftStore.getState().closeRejectDialog();

    expect(useWeeklyEntryDraftStore.getState().rejectDialog).toEqual({
      isOpen: false,
      periodId: null,
      reason: '',
    });
  });
});
