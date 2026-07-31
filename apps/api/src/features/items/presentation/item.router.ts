import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import { ForbiddenError, type AuthMembership, type AuthSession } from '../../identity/domain/auth';
import {
  CategoryNotFoundError,
  ItemNotFoundError,
  itemTrackBatchModeValues,
  itemTypeValues,
  itemUnitValues,
  type Item,
  type ItemCategory,
  type ItemTrackBatchMode,
  type ItemType,
  type ItemUnit,
} from '../domain/item';

const itemTypeSchema = z.enum(itemTypeValues);
const itemUnitSchema = z.enum(itemUnitValues);
const itemTrackBatchModeSchema = z.enum(itemTrackBatchModeValues);

const createItemBodySchema = z
  .object({
    name: z.string().min(1),
    type: itemTypeSchema,
    unit: itemUnitSchema,
    sku: z.string().min(1).nullable().optional(),
    categoryId: z.string().min(1).nullable().optional(),
    unitPrice: z.number().nonnegative().default(0),
    tracksStock: z.boolean().default(false),
    trackBatchMode: itemTrackBatchModeSchema.default('none'),
  })
  .strict();

const updateItemBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    unit: itemUnitSchema.optional(),
    sku: z.string().min(1).nullable().optional(),
    categoryId: z.string().min(1).nullable().optional(),
    unitPrice: z.number().nonnegative().optional(),
    tracksStock: z.boolean().optional(),
    trackBatchMode: itemTrackBatchModeSchema.optional(),
  })
  .strict();

const createCategoryBodySchema = z
  .object({
    name: z.string().min(1),
    parentId: z.string().min(1).nullable().optional(),
  })
  .strict();

const updateCategoryBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    parentId: z.string().min(1).nullable().optional(),
  })
  .strict();

const listItemsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().default(20),
  cursor: z.string().min(1).optional(),
});

const getItemQuerySchema = z.object({
  includeDeleted: z.enum(['true', 'false']).optional(),
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

type AuthenticatedResponseLocals = {
  auth: AuthSession;
  requestContext?: {
    correlationId: string;
    requestId: string;
  };
};

const getCompanyMembership = (auth: AuthSession): AuthMembership & { companyId: string } => {
  const membership = auth.memberships.find(
    (candidate): candidate is AuthMembership & { companyId: string } => candidate.companyId !== null,
  );

  if (!membership) {
    throw new ForbiddenError('Company membership required');
  }

  return membership;
};

const getRouteContext = (response: Parameters<RequestHandler>[1]) => {
  const locals = response.locals as AuthenticatedResponseLocals;
  const auth = locals.auth;
  const membership = getCompanyMembership(auth);

  return {
    actorUserId: auth.user.id,
    companyId: membership.companyId,
    correlationId:
      locals.requestContext?.correlationId ?? String(response.getHeader('x-correlation-id')),
    role: membership.role,
  };
};

export const createItemRouter = ({
  requireAuth,
  requireOwner,
  createItem,
  updateItem,
  softDeleteItem,
  getItem,
  listItems,
  listCategories,
  createCategory,
  updateCategory,
  getCategoryById,
}: {
  requireAuth: RequestHandler;
  requireOwner: RequestHandler;
  createItem: (input: {
    companyId: string;
    actorUserId: string;
    correlationId: string;
    name: string;
    type: ItemType;
    unit: ItemUnit;
    sku: string | null;
    categoryId: string | null;
    unitPrice: number;
    tracksStock?: boolean;
    trackBatchMode?: ItemTrackBatchMode;
  }) => Promise<{ itemId: string }>;
  updateItem: (input: {
    companyId: string;
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
    actorUserId: string;
    correlationId: string;
    itemId: string;
    role: string;
  }) => Promise<void>;
  getItem: (input: {
    companyId: string;
    itemId: string;
    includeDeleted?: boolean;
  }) => Promise<Item | null>;
  listItems: (input: {
    companyId: string;
    limit: number;
    cursor?: string;
  }) => Promise<{ items: Item[]; nextCursor: string | null }>;
  createCategory: (input: {
    companyId: string;
    actorUserId: string;
    correlationId: string;
    name: string;
    parentId: string | null;
  }) => Promise<{ categoryId: string }>;
  updateCategory: (input: {
    companyId: string;
    actorUserId: string;
    correlationId: string;
    categoryId: string;
    name?: string;
    parentId?: string | null;
  }) => Promise<{ categoryId: string }>;
  getCategoryById?: (input: {
    companyId: string;
    categoryId: string;
  }) => Promise<ItemCategory | null>;
  listCategories?: (input: { companyId: string }) => Promise<{ categories: ItemCategory[] }>;
}): Router => {
  const router = Router();

  router.post('/items', requireAuth, async (request, response, next) => {
    try {
      const body = createItemBodySchema.parse(request.body);
      const context = getRouteContext(response);
      const result = await createItem({
        ...context,
        ...body,
        sku: body.sku ?? null,
        categoryId: body.categoryId ?? null,
      });

      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/items', requireAuth, async (request, response, next) => {
    try {
      const query = listItemsQuerySchema.parse(request.query);
      const context = getRouteContext(response);
      const result = await listItems({
        companyId: context.companyId,
        limit: query.limit,
        ...(query.cursor !== undefined ? { cursor: query.cursor } : {}),
      });

      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/items/:id', requireAuth, async (request, response, next) => {
    try {
      const params = idParamsSchema.parse(request.params);
      const query = getItemQuerySchema.parse(request.query);
      const context = getRouteContext(response);
      const item = await getItem({
        companyId: context.companyId,
        itemId: params.id,
        includeDeleted: query.includeDeleted === 'true',
      });

      if (!item) {
        throw new ItemNotFoundError();
      }

      response.status(200).json(item);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/items/:id', requireAuth, async (request, response, next) => {
    try {
      const params = idParamsSchema.parse(request.params);
      const body = updateItemBodySchema.parse(request.body);
      const context = getRouteContext(response);
      const input: {
        companyId: string;
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
      } = {
        ...context,
        itemId: params.id,
      };

      if (body.name !== undefined) {
        input.name = body.name;
      }

      if (body.unit !== undefined) {
        input.unit = body.unit;
      }

      if (body.sku !== undefined) {
        input.sku = body.sku;
      }

      if (body.categoryId !== undefined) {
        input.categoryId = body.categoryId;
      }

      if (body.unitPrice !== undefined) {
        input.unitPrice = body.unitPrice;
      }

      if (body.tracksStock !== undefined) {
        input.tracksStock = body.tracksStock;
      }

      if (body.trackBatchMode !== undefined) {
        input.trackBatchMode = body.trackBatchMode;
      }

      const result = await updateItem(input);

      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/items/:id', requireAuth, requireOwner, async (request, response, next) => {
    try {
      const params = idParamsSchema.parse(request.params);
      const context = getRouteContext(response);

      await softDeleteItem({
        ...context,
        itemId: params.id,
      });

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  if (listCategories) {
    router.get('/item-categories', requireAuth, async (request, response, next) => {
      try {
        const context = getRouteContext(response);
        const result = await listCategories({ companyId: context.companyId });

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    });
  }

  router.post('/item-categories', requireAuth, async (request, response, next) => {
    try {
      const body = createCategoryBodySchema.parse(request.body);
      const context = getRouteContext(response);
      const result = await createCategory({
        ...context,
        name: body.name,
        parentId: body.parentId ?? null,
      });

      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  if (getCategoryById) {
    router.get('/item-categories/:id', requireAuth, async (request, response, next) => {
      try {
        const params = idParamsSchema.parse(request.params);
        const context = getRouteContext(response);
        const category = await getCategoryById({
          companyId: context.companyId,
          categoryId: params.id,
        });

        if (!category) {
          throw new CategoryNotFoundError();
        }

        response.status(200).json(category);
      } catch (error) {
        next(error);
      }
    });
  }

  router.patch('/item-categories/:id', requireAuth, async (request, response, next) => {
    try {
      const params = idParamsSchema.parse(request.params);
      const body = updateCategoryBodySchema.parse(request.body);
      const context = getRouteContext(response);
      const input: {
        companyId: string;
        actorUserId: string;
        correlationId: string;
        categoryId: string;
        name?: string;
        parentId?: string | null;
      } = {
        companyId: context.companyId,
        actorUserId: context.actorUserId,
        correlationId: context.correlationId,
        categoryId: params.id,
      };

      if (body.name !== undefined) {
        input.name = body.name;
      }

      if (body.parentId !== undefined) {
        input.parentId = body.parentId;
      }

      const result = await updateCategory(input);

      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
