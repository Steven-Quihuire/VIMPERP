export type DetailTab = 'info' | 'assignment' | 'documents' | 'history';

export const DETAIL_TAB_IDS: DetailTab[] = [
  'info',
  'assignment',
  'documents',
  'history',
];

export const tabItems: { id: DetailTab; label: string }[] = [
  { id: 'info', label: 'Información' },
  { id: 'assignment', label: 'Asignación' },
  { id: 'documents', label: 'Documentos' },
  { id: 'history', label: 'Historial' },
];
