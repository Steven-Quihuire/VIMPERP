export const itemTypeValues = ['product', 'service'] as const;

export const itemUnitValues = [
  'unit',
  'hour',
  'kg',
  'liter',
  'meter',
  'box',
  'service',
] as const;

export const itemTrackBatchModeValues = ['none', 'batch', 'serial'] as const;

export type ItemType = (typeof itemTypeValues)[number];

export type ItemUnit = (typeof itemUnitValues)[number];

export type ItemTrackBatchMode = (typeof itemTrackBatchModeValues)[number];

export type Item = {
  id: string;
  companyId: string;
  localId: string | null;
  categoryId: string | null;
  sku: string | null;
  name: string;
  type: ItemType;
  unit: ItemUnit;
  unitPrice: number;
  tracksStock: boolean;
  trackBatchMode: ItemTrackBatchMode;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ItemCategory = {
  id: string;
  companyId: string;
  localId: string | null;
  parentId: string | null;
  name: string;
  createdAt: Date;
};

export type ItemCatalogGateway = {
  createItem: (input: {
    companyId: string;
    localId: string | null;
    actorUserId: string;
    correlationId: string;
    name: string;
    type: ItemType;
    unit: ItemUnit;
    sku: string | null;
    categoryId: string | null;
    unitPrice: number;
    tracksStock: boolean;
    trackBatchMode: ItemTrackBatchMode;
  }) => Promise<{ itemId: string }>;
  updateItem: (input: {
    companyId: string;
    localId: string | null;
    actorUserId: string;
    correlationId: string;
    itemId: string;
    name?: string;
    unit?: ItemUnit;
    sku?: string | null;
    categoryId?: string | null;
    unitPrice?: number;
    tracksStock?: boolean;
    trackBatchMode?: ItemTrackBatchMode;
  }) => Promise<{ itemId: string }>;
  softDeleteItem: (input: {
    companyId: string;
    localId: string | null;
    actorUserId: string;
    correlationId: string;
    itemId: string;
  }) => Promise<void>;
  getItemById: (input: {
    companyId: string;
    localId: string | null;
    itemId: string;
    includeDeleted?: boolean;
  }) => Promise<Item | null>;
  listItems: (input: {
    companyId: string;
    localId: string | null;
    limit: number;
    cursor?: string;
  }) => Promise<{ items: Item[]; nextCursor: string | null }>;
};

export type CategoryGateway = {
  createCategory: (input: {
    companyId: string;
    localId: string | null;
    actorUserId: string;
    correlationId: string;
    name: string;
    parentId: string | null;
  }) => Promise<{ categoryId: string }>;
  getCategoryById: (input: {
    companyId: string;
    localId: string | null;
    categoryId: string;
  }) => Promise<ItemCategory | null>;
  listCategories: (input: {
    companyId: string;
    localId: string | null;
  }) => Promise<ItemCategory[]>;
  getDescendantIds: (input: {
    companyId: string;
    localId: string | null;
    categoryId: string;
  }) => Promise<string[]>;
  updateCategory: (input: {
    companyId: string;
    localId: string | null;
    actorUserId: string;
    correlationId: string;
    categoryId: string;
    name?: string;
    parentId?: string | null;
  }) => Promise<{ categoryId: string }>;
};

export class ItemNotFoundError extends Error {
  readonly code = 'ITEM_NOT_FOUND';

  constructor(message = 'Item not found') {
    super(message);
    this.name = 'ItemNotFoundError';
  }
}

export class ItemSkuConflictError extends Error {
  readonly code = 'ITEM_SKU_CONFLICT';

  constructor(message = 'Item SKU already exists') {
    super(message);
    this.name = 'ItemSkuConflictError';
  }
}

export class ItemTypeImmutableError extends Error {
  readonly code = 'ITEM_TYPE_IMMUTABLE';

  constructor(message = 'Item type is immutable') {
    super(message);
    this.name = 'ItemTypeImmutableError';
  }
}

export class CategoryNotFoundError extends Error {
  readonly code = 'CATEGORY_NOT_FOUND';

  constructor(message = 'Category not found') {
    super(message);
    this.name = 'CategoryNotFoundError';
  }
}

export class CategoryCycleError extends Error {
  readonly code = 'CATEGORY_CYCLE';

  constructor(message = 'Category parent cannot reference itself or a descendant') {
    super(message);
    this.name = 'CategoryCycleError';
  }
}
