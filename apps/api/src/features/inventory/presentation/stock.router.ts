import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import { ForbiddenError, type AuthSession } from '../../identity/domain/auth';
import type { PermissionScope } from '../../roles-management/domain/assignments';
import {
  stockDocumentStatusValues,
  stockDocumentTypeValues,
  stockScopeTypeValues,
} from '../domain/stock-documents';

const companyParamsSchema = z.object({ companyId: z.string().min(1) });
const documentParamsSchema = z.object({
  companyId: z.string().min(1),
  documentId: z.string().min(1),
});
const lineParamsSchema = z.object({
  companyId: z.string().min(1),
  documentId: z.string().min(1),
  lineId: z.string().min(1),
});
const listDocumentsQuerySchema = z.object({
  type: z.enum(stockDocumentTypeValues).optional(),
  status: z.enum(stockDocumentStatusValues).optional(),
});
const createDocumentBodySchema = z.object({
  type: z.enum(stockDocumentTypeValues),
  originScopeNodeId: z.string().min(1).nullable().optional().transform((value) => value ?? null),
  originScopeType: z.enum(stockScopeTypeValues).nullable().optional().transform((value) => value ?? null),
  destinationScopeNodeId: z.string().min(1).nullable().optional().transform((value) => value ?? null),
  destinationScopeType: z.enum(stockScopeTypeValues).nullable().optional().transform((value) => value ?? null),
  occurredAt: z.coerce.date(),
  note: z.string().trim().nullable().optional().transform((value) => value ?? null),
});
const lineBodySchema = z.object({
  itemId: z.string().min(1),
  quantity: z.string().min(1),
  unitCost: z.string().min(1).nullable().optional().transform((value) => value ?? null),
  lotId: z.string().min(1).nullable().optional().transform((value) => value ?? null),
});
const createLotBodySchema = z.object({
  itemId: z.string().min(1),
  lotNumber: z.string().min(1),
  expiresAt: z.union([z.coerce.date(), z.null()]).optional().transform((value) => value ?? null),
});

const getAuth = (response: Parameters<RequestHandler>[1]) =>
  (response.locals as { auth: AuthSession }).auth;

const ensureCompanyAccess = (auth: AuthSession, companyId: string) => {
  if (auth.activeCompany?.companyId !== companyId) {
    throw new ForbiddenError();
  }

  if (auth.activeCompany.status !== 'active') {
    throw new ForbiddenError('Company access unavailable');
  }
};

type ResolvePermissionScope = (input: {
  request: Parameters<RequestHandler>[0];
  response: Parameters<RequestHandler>[1];
  auth: AuthSession;
}) => PermissionScope | undefined | Promise<PermissionScope | undefined>;

export const createStockRouter = ({
  requireAuth,
  requireHrCapability,
  createDocument,
  listDocuments,
  getDocument,
  addLine,
  updateLine,
  removeLine,
  confirmDocument,
  cancelDocument,
  reverseDocument,
  createLot,
  listLots,
  listQuants,
}: {
  requireAuth: RequestHandler;
  requireHrCapability: (
    permissionKey: string,
    resolvePermissionScope?: ResolvePermissionScope,
  ) => RequestHandler;
  createDocument: (input: {
    companyId: string;
    type: string;
    originScopeNodeId: string | null;
    originScopeType: string | null;
    destinationScopeNodeId: string | null;
    destinationScopeType: string | null;
    occurredAt: Date;
    createdByUserId: string;
    note: string | null;
  }) => Promise<unknown>;
  listDocuments: (input: {
    companyId: string;
    type?: (typeof stockDocumentTypeValues)[number];
    status?: (typeof stockDocumentStatusValues)[number];
  }) => Promise<unknown>;
  getDocument: (input: { companyId: string; documentId: string }) => Promise<unknown>;
  addLine: (input: {
    companyId: string;
    documentId: string;
    itemId: string;
    quantity: string;
    unitCost: string | null;
    lotId: string | null;
  }) => Promise<unknown>;
  updateLine: (input: {
    companyId: string;
    lineId: string;
    itemId: string;
    quantity: string;
    unitCost: string | null;
    lotId: string | null;
  }) => Promise<unknown>;
  removeLine: (input: { companyId: string; lineId: string }) => Promise<void>;
  confirmDocument: (input: {
    companyId: string;
    documentId: string;
    auth: AuthSession;
  }) => Promise<unknown>;
  cancelDocument: (input: { companyId: string; documentId: string }) => Promise<unknown>;
  reverseDocument: (input: {
    companyId: string;
    documentId: string;
    createdByUserId: string;
  }) => Promise<unknown>;
  createLot: (input: {
    companyId: string;
    itemId: string;
    lotNumber: string;
    expiresAt: Date | null;
  }) => Promise<unknown>;
  listLots: (input: { companyId: string }) => Promise<unknown>;
  listQuants: (input: { companyId: string }) => Promise<unknown>;
}): Router => {
  const router = Router();

  router.post(
    '/companies/:companyId/stock-documents',
    requireAuth,
    requireHrCapability('inventory.documents.write'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);
        const body = createDocumentBodySchema.parse(request.body);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(201).json(
          await createDocument({
            companyId: params.companyId,
            ...body,
            createdByUserId: auth.user.id,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/stock-documents',
    requireAuth,
    requireHrCapability('inventory.documents.read'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);
        const query = listDocumentsQuerySchema.parse(request.query);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(200).json(
          await listDocuments({
            companyId: params.companyId,
            ...(query.type ? { type: query.type } : {}),
            ...(query.status ? { status: query.status } : {}),
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/stock-documents/:documentId',
    requireAuth,
    requireHrCapability('inventory.documents.read'),
    async (request, response, next) => {
      try {
        const params = documentParamsSchema.parse(request.params);

        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(200).json(await getDocument(params));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/stock-documents/:documentId/lines',
    requireAuth,
    requireHrCapability('inventory.documents.write'),
    async (request, response, next) => {
      try {
        const params = documentParamsSchema.parse(request.params);
        const body = lineBodySchema.parse(request.body);

        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(201).json(await addLine({ ...params, ...body }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/companies/:companyId/stock-documents/:documentId/lines/:lineId',
    requireAuth,
    requireHrCapability('inventory.documents.write'),
    async (request, response, next) => {
      try {
        const params = lineParamsSchema.parse(request.params);
        const body = lineBodySchema.parse(request.body);

        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(200).json(
          await updateLine({
            companyId: params.companyId,
            lineId: params.lineId,
            ...body,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/companies/:companyId/stock-documents/:documentId/lines/:lineId',
    requireAuth,
    requireHrCapability('inventory.documents.write'),
    async (request, response, next) => {
      try {
        const params = lineParamsSchema.parse(request.params);

        ensureCompanyAccess(getAuth(response), params.companyId);
        await removeLine({ companyId: params.companyId, lineId: params.lineId });
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/stock-documents/:documentId/confirm',
    requireAuth,
    requireHrCapability('inventory.documents.confirm'),
    async (request, response, next) => {
      try {
        const params = documentParamsSchema.parse(request.params);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(200).json(
          await confirmDocument({
            companyId: params.companyId,
            documentId: params.documentId,
            auth,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/stock-documents/:documentId/cancel',
    requireAuth,
    requireHrCapability('inventory.documents.write'),
    async (request, response, next) => {
      try {
        const params = documentParamsSchema.parse(request.params);

        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(200).json(await cancelDocument(params));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/stock-documents/:documentId/reversal',
    requireAuth,
    requireHrCapability('inventory.documents.write'),
    async (request, response, next) => {
      try {
        const params = documentParamsSchema.parse(request.params);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(200).json(
          await reverseDocument({
            companyId: params.companyId,
            documentId: params.documentId,
            createdByUserId: auth.user.id,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/stock-lots',
    requireAuth,
    requireHrCapability('inventory.stock.write'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);
        const body = createLotBodySchema.parse(request.body);

        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(201).json(await createLot({ companyId: params.companyId, ...body }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/stock-lots',
    requireAuth,
    requireHrCapability('inventory.stock.read'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);

        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(200).json(await listLots({ companyId: params.companyId }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/stock',
    requireAuth,
    requireHrCapability('inventory.stock.read'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);

        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(200).json(await listQuants({ companyId: params.companyId }));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
