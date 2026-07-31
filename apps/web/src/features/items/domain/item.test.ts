import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  isCompanyOwner,
  itemTrackBatchModeValues,
  itemTypeValues,
  itemUnitValues,
  type Item,
  type ItemCategory,
  type ItemGateway,
  type ItemTrackBatchMode,
  type ItemType,
  type ItemUnit,
} from './item';

describe('item domain', () => {
  it('returns true only when the role is company-owner', () => {
    expect(isCompanyOwner('company-owner')).toBe(true);
    expect(isCompanyOwner('company-user')).toBe(false);
  });

  it('exports type-safe item domain literals and contracts', () => {
    expect(itemTypeValues).toEqual(['product', 'service']);
    expect(itemUnitValues).toEqual(['unit', 'hour', 'kg', 'liter', 'meter', 'box', 'service']);
    expect(itemTrackBatchModeValues).toEqual(['none', 'batch', 'serial']);

    expectTypeOf<ItemType>().toEqualTypeOf<'product' | 'service'>();
    expectTypeOf<ItemUnit>().toEqualTypeOf<
      'unit' | 'hour' | 'kg' | 'liter' | 'meter' | 'box' | 'service'
    >();
    expectTypeOf<ItemTrackBatchMode>().toEqualTypeOf<'none' | 'batch' | 'serial'>();
    expectTypeOf<Item['deletedAt']>().toEqualTypeOf<string | null>();
    expectTypeOf<ItemCategory['parentId']>().toEqualTypeOf<string | null>();
    expectTypeOf<ItemGateway['softDeleteItem']>().returns.toEqualTypeOf<Promise<void>>();
    expectTypeOf<ItemGateway['fetchItems']>().returns.toEqualTypeOf<
      Promise<{ items: Item[]; nextCursor: string | null }>
    >();
  });
});
