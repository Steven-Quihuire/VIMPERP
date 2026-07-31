export const itemTypeValues = ['product', 'service'] as const;

export const itemUnitValues = ['unit', 'hour', 'kg', 'liter', 'meter', 'box', 'service'] as const;

export const itemTrackBatchModeValues = ['none', 'batch', 'serial'] as const;

export type ItemType = (typeof itemTypeValues)[number];

export type ItemUnit = (typeof itemUnitValues)[number];

export type ItemTrackBatchMode = (typeof itemTrackBatchModeValues)[number];

export type Item = {
  id: string;
  companyId: string;
  categoryId: string | null;
  sku: string | null;
  name: string;
  type: ItemType;
  unit: ItemUnit;
  unitPrice: number;
  tracksStock: boolean;
  trackBatchMode: ItemTrackBatchMode;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ItemCategory = {
  id: string;
  companyId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
};

export type CreateItemInput = {
  categoryId: string | null;
  sku: string | null;
  name: string;
  type: ItemType;
  unit: ItemUnit;
  unitPrice: number;
  tracksStock: boolean;
  trackBatchMode: ItemTrackBatchMode;
};

export type UpdateItemInput = Partial<Omit<CreateItemInput, 'type'>>;

export type CreateItemCategoryInput = {
  parentId: string | null;
  name: string;
};

export type UpdateItemCategoryInput = Partial<CreateItemCategoryInput>;

export type ItemGateway = {
  fetchItems: (limit?: number, cursor?: string) => Promise<{ items: Item[]; nextCursor: string | null }>;
  fetchItem: (id: string) => Promise<Item | null>;
  createItem: (input: CreateItemInput) => Promise<{ itemId: string }>;
  updateItem: (id: string, input: UpdateItemInput) => Promise<{ itemId: string }>;
  softDeleteItem: (id: string) => Promise<void>;
  fetchCategories: () => Promise<{ categories: ItemCategory[] }>;
  createCategory: (input: CreateItemCategoryInput) => Promise<{ categoryId: string }>;
  updateCategory: (id: string, input: UpdateItemCategoryInput) => Promise<{ categoryId: string }>;
};

export const isCompanyOwner = (role: string) => role === 'company-owner';
