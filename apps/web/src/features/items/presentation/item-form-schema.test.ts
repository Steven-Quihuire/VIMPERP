import { describe, expect, it } from 'vitest';

import { itemFormSchema, toPatchPayload } from './item-form-schema';

describe('itemFormSchema', () => {
  it('strips the immutable type field from patch payloads', () => {
    const parsed = itemFormSchema.parse({
      name: 'Desk lamp',
      type: 'product',
      sku: 'SKU-1',
      unit: 'unit',
      unitPrice: 15,
      tracksStock: true,
      trackBatchMode: 'none',
      categoryId: 'category-1',
    });

    expect(toPatchPayload(parsed)).toEqual({
      name: 'Desk lamp',
      sku: 'SKU-1',
      unit: 'unit',
      unitPrice: 15,
      tracksStock: true,
      trackBatchMode: 'none',
      categoryId: 'category-1',
    });
  });

  it('rejects a negative unit price', () => {
    const result = itemFormSchema.safeParse({
      name: 'Desk lamp',
      type: 'product',
      sku: '',
      unit: 'unit',
      unitPrice: -1,
      tracksStock: true,
      trackBatchMode: 'none',
      categoryId: '',
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.unitPrice).toContain('Unit price must be 0 or more.');
  });

  it('rejects an empty name', () => {
    const result = itemFormSchema.safeParse({
      name: '   ',
      type: 'product',
      sku: '',
      unit: 'unit',
      unitPrice: 0,
      tracksStock: false,
      trackBatchMode: 'none',
      categoryId: '',
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.name).toContain('Name is required.');
  });

  it('rejects an invalid unit value', () => {
    const result = itemFormSchema.safeParse({
      name: 'Desk lamp',
      type: 'product',
      sku: '',
      unit: 'invalid',
      unitPrice: 0,
      tracksStock: false,
      trackBatchMode: 'none',
      categoryId: '',
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.unit).toBeDefined();
  });
});
