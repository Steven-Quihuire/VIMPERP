import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import { ForbiddenError, type AuthRole, type AuthSession } from '../../identity/domain/auth';
import type { Division, Local } from '../domain/org-hierarchy';

type CreateDivision = (input: { companyId: string; name: string }) =>
  Promise<Division>;
type ListDivisions = (companyId: string) => Promise<Division[]>;
type UpdateDivision = (input: { divisionId: string; name: string }) =>
  Promise<Division>;
type DeleteDivision = (divisionId: string) => Promise<void>;
type CreateLocal = (input: {
  companyId: string;
  name: string;
  divisionId?: string | null;
}) => Promise<Local>;
type ListLocals = (companyId: string) => Promise<Local[]>;
type UpdateLocal = (input: {
  localId: string;
  name?: string;
  divisionId?: string | null;
}) => Promise<Local>;
type DeleteLocal = (localId: string) => Promise<void>;

type AuthenticatedResponseLocals = {
  auth: AuthSession;
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

const companyIdParamsSchema = z.object({
  companyId: z.string().min(1),
});

const divisionIdParamsSchema = z.object({
  divisionId: z.string().min(1),
});

const localIdParamsSchema = z.object({
  localId: z.string().min(1),
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

export const createOrgHierarchyRouter = ({
  requireAuth,
  requireRole,
  createDivision,
  listDivisions,
  updateDivision,
  deleteDivision,
  createLocal,
  listLocals,
  updateLocal,
  deleteLocal,
}: {
  requireAuth: RequestHandler;
  requireRole: (...roles: AuthRole[]) => RequestHandler;
  createDivision: CreateDivision;
  listDivisions: ListDivisions;
  updateDivision: UpdateDivision;
  deleteDivision: DeleteDivision;
  createLocal: CreateLocal;
  listLocals: ListLocals;
  updateLocal: UpdateLocal;
  deleteLocal: DeleteLocal;
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
        const body = updateDivisionBodySchema.parse(request.body);
        const division = await updateDivision({
          divisionId: params.divisionId,
          name: body.name,
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
        await deleteDivision(params.divisionId);

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
        const body = updateLocalBodySchema.parse(request.body);
        const local = await updateLocal({
          localId: params.localId,
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
        await deleteLocal(params.localId);

        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};