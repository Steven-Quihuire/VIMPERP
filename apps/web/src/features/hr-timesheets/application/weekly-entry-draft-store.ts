import { create } from 'zustand';

import type { WeeklyEntryDraft } from '../domain/timesheets';

type RejectDialogState = {
  isOpen: boolean;
  periodId: string | null;
  reason: string;
};

type WeeklyEntryDraftStore = {
  drafts: Record<string, WeeklyEntryDraft>;
  rejectDialog: RejectDialogState;
  setDraft: (draftKey: string, draft: WeeklyEntryDraft) => void;
  clearDraft: (draftKey: string) => void;
  resetDrafts: () => void;
  openRejectDialog: (periodId: string, reason?: string) => void;
  setRejectReason: (reason: string) => void;
  closeRejectDialog: () => void;
};

const closedRejectDialogState = (): RejectDialogState => ({
  isOpen: false,
  periodId: null,
  reason: '',
});

export const useWeeklyEntryDraftStore = create<WeeklyEntryDraftStore>((set) => ({
  drafts: {},
  rejectDialog: closedRejectDialogState(),
  setDraft: (draftKey, draft) =>
    set((state) => ({
      drafts: {
        ...state.drafts,
        [draftKey]: draft,
      },
    })),
  clearDraft: (draftKey) =>
    set((state) => {
      const nextDrafts = { ...state.drafts };
      delete nextDrafts[draftKey];
      return { drafts: nextDrafts };
    }),
  resetDrafts: () => set({ drafts: {} }),
  openRejectDialog: (periodId, reason = '') =>
    set({ rejectDialog: { isOpen: true, periodId, reason } }),
  setRejectReason: (reason) =>
    set((state) => ({
      rejectDialog: {
        ...state.rejectDialog,
        reason,
      },
    })),
  closeRejectDialog: () => set({ rejectDialog: closedRejectDialogState() }),
}));
