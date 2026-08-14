import { z } from 'zod';

export type Position = {
  id: string;
  companyId: string;
  name: string;
  reportsToPositionId: string | null;
  headcount: number;
  occupiedHeadcount: number;
  remainingVacancies: number;
  isActive: boolean;
  createdAt: string;
};

export const positionFormSchema = z.object({
  name: z.string().trim().min(1, 'Position name is required.'),
  reportsToPositionId: z.string().trim().default(''),
  headcount: z.coerce.number().int().nonnegative(),
  isActive: z.boolean(),
});

export type PositionFormValues = z.output<typeof positionFormSchema>;

export type CreatePositionInput = {
  companyId: string;
  name: string;
  reportsToPositionId: string | null;
  headcount: number;
  isActive: boolean;
};

export const sortPositionsByName = (positions: Position[]) => {
  return [...positions].sort((left, right) => left.name.localeCompare(right.name));
};

export const toCreatePositionInput = (
  companyId: string,
  values: PositionFormValues,
): CreatePositionInput => ({
  companyId,
  name: values.name.trim(),
  reportsToPositionId: values.reportsToPositionId.trim() || null,
  headcount: values.headcount,
  isActive: values.isActive,
});
