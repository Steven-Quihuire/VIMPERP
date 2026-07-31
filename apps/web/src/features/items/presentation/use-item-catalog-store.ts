import { create } from 'zustand';

export type ItemCatalogPanelMode = 'view' | 'edit' | 'create';

type ItemCatalogStore = {
  selectedItemId: string | null;
  panelMode: ItemCatalogPanelMode;
  setSelectedItem: (id: string | null) => void;
  setPanelMode: (mode: ItemCatalogPanelMode) => void;
  startCreate: () => void;
  clearSelection: () => void;
};

export const useItemCatalogStore = create<ItemCatalogStore>((set) => ({
  selectedItemId: null,
  panelMode: 'view',
  setSelectedItem: (id) => set({ selectedItemId: id }),
  setPanelMode: (mode) => set({ panelMode: mode }),
  startCreate: () => set({ selectedItemId: null, panelMode: 'create' }),
  clearSelection: () => set({ selectedItemId: null, panelMode: 'view' }),
}));
