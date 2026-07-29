export type DashboardCursorPage<TItem> = {
  items: TItem[];
  nextCursor: string | null;
};
