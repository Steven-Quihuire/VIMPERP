import { z } from 'zod';

import {
  itemTrackBatchModeValues,
  itemTypeValues,
  itemUnitValues,
  type CreateItemInput,
  type UpdateItemInput,
} from '../domain/item';

const normalizeOptionalText = (value: string | null | undefined) => {
  const trimmedValue = value?.trim() ?? '';

  return trimmedValue.length > 0 ? trimmedValue : null;
};

export const itemFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  type: z.enum(itemTypeValues),
  sku: z.string(),
  unit: z.enum(itemUnitValues),
  unitPrice: z.coerce.number().min(0, 'Unit price must be 0 or more.'),
  tracksStock: z.boolean(),
  trackBatchMode: z.enum(itemTrackBatchModeValues),
  categoryId: z.string(),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;

export const toCreatePayload = (input: ItemFormValues): CreateItemInput => ({
  name: input.name.trim(),
  type: input.type,
  sku: normalizeOptionalText(input.sku),
  unit: input.unit,
  unitPrice: input.unitPrice,
  tracksStock: input.tracksStock,
  trackBatchMode: input.trackBatchMode,
  categoryId: normalizeOptionalText(input.categoryId),
});

export const toPatchPayload = (input: ItemFormValues): UpdateItemInput => {
  const payload = toCreatePayload(input);

  return {
    name: payload.name,
    sku: payload.sku,
    unit: payload.unit,
    unitPrice: payload.unitPrice,
    tracksStock: payload.tracksStock,
    trackBatchMode: payload.trackBatchMode,
    categoryId: payload.categoryId,
  };
};
