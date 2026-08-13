import { Router, type RequestHandler, type Response } from 'express';
import { z } from 'zod';

import { ForbiddenError, type AuthRole, type AuthSession } from '../../identity/domain/auth';
import type {
  Area,
  Division,
  Local,
  PointOfSale,
  Warehouse,
} from '../domain/org-hierarchy';

type CreateDivision = (input: { companyId: string; name: string }) =>
  Promise<Division>;
type ListDivisions = (companyId: string) => Promise<Division[]>;
type FindDivisionById = (divisionId: string) => Promise<Division | null>;
type UpdateDivision = (input: {
  divisionId: string;
  name: string;
  actorUserId: string;
  correlationId: string;
}) =>
  Promise<Division>;
type DeleteDivision = (input: {
  divisionId: string;
  actorUserId: string;
  correlationId: string;
}) => Promise<void>;
type CreateLocal = (input: {
  companyId: string;
  name: string;
  divisionId?: string | null;
  actorUserId: string;
  correlationId: string;
}) => Promise<Local>;
type ListLocals = (companyId: string) => Promise<Local[]>;
type FindLocalById = (localId: string) => Promise<Local | null>;
type UpdateLocal = (input: {
  localId: string;
  name?: string;
  divisionId?: string | null;
  actorUserId: string;
  correlationId: string;
}) => Promise<Local>;
type DeleteLocal = (input: {
  localId: string;
  actorUserId: string;
  correlationId: string;
}) => Promise<void>;
type CreateArea = (input: {
  companyId: string;
  name: string;
  actorUserId: string;
  correlationId: string;
} & ({ divisionId: string; localId?: never } | { divisionId?: never; localId: string })) => Promise<Area>;
type ListAreas = (companyId: string) => Promise<Area[]>;
type FindAreaById = (areaId: string) => Promise<Area | null>;
type UpdateArea = (input:
  | { areaId: string; name: string; actorUserId: string; correlationId: string }
  | ({ areaId: string; name?: string | undefined; actorUserId: string; correlationId: string } &
      ({ divisionId: string; localId?: never } | { divisionId?: never; localId: string }))) => Promise<Area>;
type DeleteArea = (input: {
  areaId: string;
  actorUserId: string;
  correlationId: string;
}) => Promise<void>;
type CreateWarehouse = (input: {
  companyId: string;
  name: string;
  actorUserId: string;
  correlationId: string;
} & ({ areaId: string; localId?: never } | { areaId?: never; localId: string })) => Promise<Warehouse>;
type ListWarehouses = (companyId: string) => Promise<Warehouse[]>;
type FindWarehouseById = (warehouseId: string) => Promise<Warehouse | null>;
type UpdateWarehouse = (input:
  | { warehouseId: string; name: string; actorUserId: string; correlationId: string }
  | ({ warehouseId: string; name?: string | undefined; actorUserId: string; correlationId: string } &
      ({ areaId: string; localId?: never } | { areaId?: never; localId: string }))) => Promise<Warehouse>;
type DeleteWarehouse = (input: {
  warehouseId: string;
  actorUserId: string;
  correlationId: string;
}) => Promise<void>;
type CreatePointOfSale = (input: {
  companyId: string;
  name: string;
  actorUserId: string;
  correlationId: string;
} & ({ areaId: string; localId?: never } | { areaId?: never; localId: string })) => Promise<PointOfSale>;
type ListPointsOfSale = (companyId: string) => Promise<PointOfSale[]>;
type FindPointOfSaleById = (pointOfSaleId: string) => Promise<PointOfSale | null>;
type UpdatePointOfSale = (input:
  | { pointOfSaleId: string; name: string; actorUserId: string; correlationId: string }
  | ({ pointOfSaleId: string; name?: string | undefined; actorUserId: string; correlationId: string } &
      ({ areaId: string; localId?: never } | { areaId?: never; localId: string }))) => Promise<PointOfSale>;
type DeletePointOfSale = (input: {
  pointOfSaleId: string;
  actorUserId: string;
  correlationId: string;
}) => Promise<void>;

type AuthenticatedResponseLocals = {
  auth: AuthSession;
  requestContext?: {
    correlationId: string;
    requestId: string;
  };
};

const getAuditContext = (response: Response, auth: AuthSession) => {
  const locals = response.locals as AuthenticatedResponseLocals;

  return {
    actorUserId: auth.user.id,
    correlationId:
      locals.requestContext?.correlationId ??
      String(response.getHeader('x-correlation-id')),
  };
};

const createDivisionBodySchema = z.object({
  name: z.string().min(1),
});

const updateDivisionBodySchema = z.object({
  name: z.string().min(1),
});

const createLocalBodySchema = z.object({
  name: z.string().min(1),
  divisionId: z.string().min(1).nullable().optional(),
});

const updateLocalBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    divisionId: z.string().min(1).nullable().optional(),
  })
  .strict();

const createAreaBodySchema = z.union([
  z.object({ name: z.string().min(1), divisionId: z.string().min(1) }).strict(),
  z.object({ name: z.string().min(1), localId: z.string().min(1) }).strict(),
]);

const updateAreaBodySchema = z
  .union([
    z
      .object({ name: z.string().min(1).optional(), divisionId: z.string().min(1) })
      .strict(),
    z
      .object({ name: z.string().min(1).optional(), localId: z.string().min(1) })
      .strict(),
    z.object({ name: z.string().min(1) }).strict(),
  ]);

const createWarehouseBodySchema = z.union([
  z.object({ name: z.string().min(1), areaId: z.string().min(1) }).strict(),
  z.object({ name: z.string().min(1), localId: z.string().min(1) }).strict(),
]);

const updateWarehouseBodySchema = z
  .union([
    z.object({ name: z.string().min(1).optional(), areaId: z.string().min(1) }).strict(),
    z.object({ name: z.string().min(1).optional(), localId: z.string().min(1) }).strict(),
    z.object({ name: z.string().min(1) }).strict(),
  ]);

const createPointOfSaleBodySchema = z.union([
  z.object({ name: z.string().min(1), areaId: z.string().min(1) }).strict(),
  z.object({ name: z.string().min(1), localId: z.string().min(1) }).strict(),
]);

const updatePointOfSaleBodySchema = z
  .union([
    z.object({ name: z.string().min(1).optional(), areaId: z.string().min(1) }).strict(),
    z.object({ name: z.string().min(1).optional(), localId: z.string().min(1) }).strict(),
    z.object({ name: z.string().min(1) }).strict(),
  ]);

const companyIdParamsSchema = z.object({
  companyId: z.string().min(1),
});

const divisionIdParamsSchema = z.object({
  divisionId: z.string().min(1),
});

const localIdParamsSchema = z.object({
  localId: z.string().min(1),
});

const areaIdParamsSchema = z.object({
  areaId: z.string().min(1),
});

const warehouseIdParamsSchema = z.object({
  warehouseId: z.string().min(1),
});

const pointOfSaleIdParamsSchema = z.object({
  pointOfSaleId: z.string().min(1),
});

export const requireCompanyMembership = (
  auth: AuthSession,
  companyId: string,
  roles: AuthRole[],
) => {
  const membership = auth.memberships.find(
    (m) => m.companyId === companyId && roles.includes(m.role),
  );

  if (!membership) {
    throw new ForbiddenError();
  }
};

const requireEntityOwnership = (
  auth: AuthSession,
  entity: { companyId: string } | null,
) => {
  if (!entity) {
    return;
  }

  requireCompanyMembership(auth, entity.companyId, ['company-owner']);
};

export const createOrgHierarchyRouter = ({
  requireAuth,
  requireRole,
  createDivision,
  listDivisions,
  findDivisionById,
  updateDivision,
  deleteDivision,
  createLocal,
  listLocals,
  findLocalById,
  updateLocal,
  deleteLocal,
  createArea,
  listAreas,
  findAreaById,
  updateArea,
  deleteArea,
  createWarehouse,
  listWarehouses,
  findWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  createPointOfSale,
  listPointsOfSale,
  findPointOfSaleById,
  updatePointOfSale,
  deletePointOfSale,
}: {
  requireAuth: RequestHandler;
  requireRole: (...roles: AuthRole[]) => RequestHandler;
  createDivision: CreateDivision;
  listDivisions: ListDivisions;
  findDivisionById: FindDivisionById;
  updateDivision: UpdateDivision;
  deleteDivision: DeleteDivision;
  createLocal: CreateLocal;
  listLocals: ListLocals;
  findLocalById: FindLocalById;
  updateLocal: UpdateLocal;
  deleteLocal: DeleteLocal;
  createArea: CreateArea;
  listAreas: ListAreas;
  findAreaById: FindAreaById;
  updateArea: UpdateArea;
  deleteArea: DeleteArea;
  createWarehouse: CreateWarehouse;
  listWarehouses: ListWarehouses;
  findWarehouseById: FindWarehouseById;
  updateWarehouse: UpdateWarehouse;
  deleteWarehouse: DeleteWarehouse;
  createPointOfSale: CreatePointOfSale;
  listPointsOfSale: ListPointsOfSale;
  findPointOfSaleById: FindPointOfSaleById;
  updatePointOfSale: UpdatePointOfSale;
  deletePointOfSale: DeletePointOfSale;
}): Router => {
  const router = Router();

  router.post(
    '/companies/:companyId/divisions',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = companyIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireCompanyMembership(auth, params.companyId, ['company-owner']);
        const body = createDivisionBodySchema.parse(request.body);
        const division = await createDivision({
          companyId: params.companyId,
          name: body.name,
          ...getAuditContext(response, auth),
        });

        response.status(201).json(division);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/divisions',
    requireAuth,
    requireRole('company-owner', 'company-user'),
    async (request, response, next) => {
      try {
        const params = companyIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireCompanyMembership(auth, params.companyId, [
          'company-owner',
          'company-user',
        ]);
        const divisions = await listDivisions(params.companyId);

        response.status(200).json(divisions);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/divisions/:divisionId',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = divisionIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireEntityOwnership(auth, await findDivisionById(params.divisionId));
        const body = updateDivisionBodySchema.parse(request.body);
        const division = await updateDivision({
          divisionId: params.divisionId,
          name: body.name,
          ...getAuditContext(response, auth),
        });

        response.status(200).json(division);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/divisions/:divisionId',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = divisionIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireEntityOwnership(auth, await findDivisionById(params.divisionId));
        await deleteDivision({
          divisionId: params.divisionId,
          ...getAuditContext(response, auth),
        });

        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/locals',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = companyIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireCompanyMembership(auth, params.companyId, ['company-owner']);
        const body = createLocalBodySchema.parse(request.body);
        const local = await createLocal({
          companyId: params.companyId,
          name: body.name,
          ...getAuditContext(response, auth),
          ...(body.divisionId !== undefined ? { divisionId: body.divisionId } : {}),
        });

        response.status(201).json(local);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/locals',
    requireAuth,
    requireRole('company-owner', 'company-user'),
    async (request, response, next) => {
      try {
        const params = companyIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireCompanyMembership(auth, params.companyId, [
          'company-owner',
          'company-user',
        ]);
        const locals = await listLocals(params.companyId);

        response.status(200).json(locals);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/locals/:localId',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = localIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireEntityOwnership(auth, await findLocalById(params.localId));
        const body = updateLocalBodySchema.parse(request.body);
        const local = await updateLocal({
          localId: params.localId,
          ...getAuditContext(response, auth),
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.divisionId !== undefined ? { divisionId: body.divisionId } : {}),
        });

        response.status(200).json(local);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/locals/:localId',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = localIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireEntityOwnership(auth, await findLocalById(params.localId));
        await deleteLocal({
          localId: params.localId,
          ...getAuditContext(response, auth),
        });

        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/areas',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = companyIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireCompanyMembership(auth, params.companyId, ['company-owner']);
        const body = createAreaBodySchema.parse(request.body);
        const context = getAuditContext(response, auth);
        const area = await createArea(
          'divisionId' in body
            ? {
                companyId: params.companyId,
                name: body.name,
                ...context,
                divisionId: body.divisionId,
              }
            : {
                companyId: params.companyId,
                name: body.name,
                ...context,
                localId: body.localId,
              },
        );

        response.status(201).json(area);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/areas',
    requireAuth,
    requireRole('company-owner', 'company-user'),
    async (request, response, next) => {
      try {
        const params = companyIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireCompanyMembership(auth, params.companyId, [
          'company-owner',
          'company-user',
        ]);
        const areas = await listAreas(params.companyId);

        response.status(200).json(areas);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/areas/:areaId',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = areaIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireEntityOwnership(auth, await findAreaById(params.areaId));
        const body = updateAreaBodySchema.parse(request.body);
        const context = getAuditContext(response, auth);
        const area = await updateArea(
          'divisionId' in body
            ? {
                areaId: params.areaId,
                ...context,
                ...(body.name !== undefined ? { name: body.name } : {}),
                divisionId: body.divisionId,
              }
            : 'localId' in body
              ? {
                  areaId: params.areaId,
                  ...context,
                  ...(body.name !== undefined ? { name: body.name } : {}),
                  localId: body.localId,
                }
              : {
                  areaId: params.areaId,
                  ...context,
                  name: body.name,
                },
        );

        response.status(200).json(area);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/areas/:areaId',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = areaIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireEntityOwnership(auth, await findAreaById(params.areaId));
        await deleteArea({
          areaId: params.areaId,
          ...getAuditContext(response, auth),
        });

        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/warehouses',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = companyIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireCompanyMembership(auth, params.companyId, ['company-owner']);
        const body = createWarehouseBodySchema.parse(request.body);
        const context = getAuditContext(response, auth);
        const warehouse = await createWarehouse(
          'areaId' in body
            ? {
                companyId: params.companyId,
                name: body.name,
                ...context,
                areaId: body.areaId,
              }
            : {
                companyId: params.companyId,
                name: body.name,
                ...context,
                localId: body.localId,
              },
        );

        response.status(201).json(warehouse);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/warehouses',
    requireAuth,
    requireRole('company-owner', 'company-user'),
    async (request, response, next) => {
      try {
        const params = companyIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireCompanyMembership(auth, params.companyId, [
          'company-owner',
          'company-user',
        ]);
        const warehouses = await listWarehouses(params.companyId);

        response.status(200).json(warehouses);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/warehouses/:warehouseId',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = warehouseIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireEntityOwnership(auth, await findWarehouseById(params.warehouseId));
        const body = updateWarehouseBodySchema.parse(request.body);
        const context = getAuditContext(response, auth);
        const warehouse = await updateWarehouse(
          'areaId' in body
            ? {
                warehouseId: params.warehouseId,
                ...context,
                ...(body.name !== undefined ? { name: body.name } : {}),
                areaId: body.areaId,
              }
            : 'localId' in body
              ? {
                  warehouseId: params.warehouseId,
                  ...context,
                  ...(body.name !== undefined ? { name: body.name } : {}),
                  localId: body.localId,
                }
              : {
                  warehouseId: params.warehouseId,
                  ...context,
                  name: body.name,
                },
        );

        response.status(200).json(warehouse);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/warehouses/:warehouseId',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = warehouseIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireEntityOwnership(auth, await findWarehouseById(params.warehouseId));
        await deleteWarehouse({
          warehouseId: params.warehouseId,
          ...getAuditContext(response, auth),
        });

        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/points-of-sale',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = companyIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireCompanyMembership(auth, params.companyId, ['company-owner']);
        const body = createPointOfSaleBodySchema.parse(request.body);
        const context = getAuditContext(response, auth);
        const pointOfSale = await createPointOfSale(
          'areaId' in body
            ? {
                companyId: params.companyId,
                name: body.name,
                ...context,
                areaId: body.areaId,
              }
            : {
                companyId: params.companyId,
                name: body.name,
                ...context,
                localId: body.localId,
              },
        );

        response.status(201).json(pointOfSale);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/points-of-sale',
    requireAuth,
    requireRole('company-owner', 'company-user'),
    async (request, response, next) => {
      try {
        const params = companyIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireCompanyMembership(auth, params.companyId, [
          'company-owner',
          'company-user',
        ]);
        const pointsOfSale = await listPointsOfSale(params.companyId);

        response.status(200).json(pointsOfSale);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/points-of-sale/:pointOfSaleId',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = pointOfSaleIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireEntityOwnership(auth, await findPointOfSaleById(params.pointOfSaleId));
        const body = updatePointOfSaleBodySchema.parse(request.body);
        const context = getAuditContext(response, auth);
        const pointOfSale = await updatePointOfSale(
          'areaId' in body
            ? {
                pointOfSaleId: params.pointOfSaleId,
                ...context,
                ...(body.name !== undefined ? { name: body.name } : {}),
                areaId: body.areaId,
              }
            : 'localId' in body
              ? {
                  pointOfSaleId: params.pointOfSaleId,
                  ...context,
                  ...(body.name !== undefined ? { name: body.name } : {}),
                  localId: body.localId,
                }
              : {
                  pointOfSaleId: params.pointOfSaleId,
                  ...context,
                  name: body.name,
                },
        );

        response.status(200).json(pointOfSale);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/points-of-sale/:pointOfSaleId',
    requireAuth,
    requireRole('company-owner'),
    async (request, response, next) => {
      try {
        const params = pointOfSaleIdParamsSchema.parse(request.params);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        requireEntityOwnership(auth, await findPointOfSaleById(params.pointOfSaleId));
        await deletePointOfSale({
          pointOfSaleId: params.pointOfSaleId,
          ...getAuditContext(response, auth),
        });

        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
