import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import {
  ForbiddenError,
  requireTenantCapability,
  type AuthCapability,
  type AuthSession,
  type CompanyLifecycle,
} from '../../identity/domain/auth';
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
    companyId: z.string().min(1).optional(),
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

const getRouteContext = (
  response: Parameters<RequestHandler>[1],
  capability: AuthCapability,
) => {
  const locals = response.locals as AuthenticatedResponseLocals;
  const auth = locals.auth;
  const activeCompany = requireTenantCapability(auth, capability);

  if (auth.activeScope === null) {
    throw new ForbiddenError('Active scope required');
  }

  return {
    actorUserId: auth.user.id,
    capabilities: activeCompany.capabilities,
    companyId: activeCompany.companyId,
    localId:
      auth.activeScope?.scopeType === 'local' ? auth.activeScope.scopeId : null,
    companyStatus: activeCompany.status,
    correlationId:
      locals.requestContext?.correlationId ?? String(response.getHeader('x-correlation-id')),
  };
};

export const createItemRouter = ({
  requireAuth,
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
  createItem: (input: {
    companyId: string;
    localId: string | null;
    actorUserId: string;
    capabilities: AuthCapability[];
    companyStatus: CompanyLifecycle;
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
    localId: string | null;
    actorUserId: string;
    capabilities: AuthCapability[];
    companyStatus: CompanyLifecycle;
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
    capabilities: AuthCapability[];
    companyStatus: CompanyLifecycle;
    correlationId: string;
    itemId: string;
  }) => Promise<void>;
  getItem: (input: {
    companyId: string;
    localId: string | null;
    capabilities: AuthCapability[];
    companyStatus: CompanyLifecycle;
    itemId: string;
    includeDeleted?: boolean;
  }) => Promise<Item | null>;
  listItems: (input: {
    companyId: string;
    localId: string | null;
    capabilities: AuthCapability[];
    companyStatus: CompanyLifecycle;
    limit: number;
    cursor?: string;
  }) => Promise<{ items: Item[]; nextCursor: string | null }>;
  createCategory: (input: {
    companyId: string;
    localId: string | null;
    actorUserId: string;
    capabilities: AuthCapability[];
    companyStatus: CompanyLifecycle;
    correlationId: string;
    name: string;
    parentId: string | null;
  }) => Promise<{ categoryId: string }>;
  updateCategory: (input: {
    companyId: string;
    localId: string | null;
    actorUserId: string;
    capabilities: AuthCapability[];
    companyStatus: CompanyLifecycle;
    correlationId: string;
    categoryId: string;
    name?: string;
    parentId?: string | null;
  }) => Promise<{ categoryId: string }>;
  getCategoryById?: (input: {
    companyId: string;
    localId: string | null;
    categoryId: string;
  }) => Promise<ItemCategory | null>;
  listCategories?: (input: {
    companyId: string;
    localId: string | null;
    capabilities: AuthCapability[];
    companyStatus: CompanyLifecycle;
  }) => Promise<{ categories: ItemCategory[] }>;
}): Router => {
  const router = Router();

  router.post('/items', requireAuth, async (request, response, next) => {
    try {
      const body = createItemBodySchema.parse(request.body);
      const context = getRouteContext(response, 'catalog.write');
      const { companyId: ignoredCompanyId, ...itemBody } = body;
      void ignoredCompanyId;
      const result = await createItem({
        ...context,
        ...itemBody,
        sku: itemBody.sku ?? null,
        categoryId: itemBody.categoryId ?? null,
      });

      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/items', requireAuth, async (request, response, next) => {
    try {
      const query = listItemsQuerySchema.parse(request.query);
      const context = getRouteContext(response, 'catalog.read');
      const result = await listItems({
        capabilities: context.capabilities,
        companyId: context.companyId,
        localId: context.localId,
        companyStatus: context.companyStatus,
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
      const context = getRouteContext(response, 'catalog.read');
      const item = await getItem({
        capabilities: context.capabilities,
        companyId: context.companyId,
        localId: context.localId,
        companyStatus: context.companyStatus,
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
      const context = getRouteContext(response, 'catalog.write');
      const input: {
        companyId: string;
        localId: string | null;
        actorUserId: string;
        capabilities: AuthCapability[];
        companyStatus: CompanyLifecycle;
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

  router.delete('/items/:id', requireAuth, async (request, response, next) => {
    try {
      const params = idParamsSchema.parse(request.params);
      const context = getRouteContext(response, 'catalog.delete');

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
        const context = getRouteContext(response, 'catalog.read');
        const result = await listCategories({
          capabilities: context.capabilities,
          companyId: context.companyId,
          localId: context.localId,
          companyStatus: context.companyStatus,
        });

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    });
  }

  router.post('/item-categories', requireAuth, async (request, response, next) => {
    try {
      const body = createCategoryBodySchema.parse(request.body);
      const context = getRouteContext(response, 'catalog.write');
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
        const context = getRouteContext(response, 'catalog.read');
        const category = await getCategoryById({
          companyId: context.companyId,
          localId: context.localId,
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
      const context = getRouteContext(response, 'catalog.write');
      const input: {
        companyId: string;
        localId: string | null;
        actorUserId: string;
        capabilities: AuthCapability[];
        companyStatus: CompanyLifecycle;
        correlationId: string;
        categoryId: string;
        name?: string;
        parentId?: string | null;
      } = {
        companyId: context.companyId,
        localId: context.localId,
        actorUserId: context.actorUserId,
        capabilities: context.capabilities,
        companyStatus: context.companyStatus,
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
