import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { ForbiddenError, type AuthSession } from '../../identity/domain/auth';
import { createOrgTreeRouter } from './org-tree.router';

const session: AuthSession = {
  user: {
    id: 'user-1',
    email: 'owner@vimcore.test',
    username: 'owner',
  },
  memberships: [
    {
      companyId: 'company-a',
      role: 'company-owner',
      divisionId: null,
      localId: null,
    },
  ],
  activeCompany: {
    companyId: 'company-a',
    status: 'active',
  },
  activeLocalId: null,
  capabilities: ['catalog.read', 'catalog.write', 'catalog.delete'],
};

describe('createOrgTreeRouter', () => {
  it('returns the authorized tree for the requested company', async () => {
    const listOrgTree = vi.fn().mockResolvedValue([
      {
        ref: { scopeType: 'division', scopeId: 'division-1' },
        parentRef: { scopeType: 'company', scopeId: 'company-a' },
        companyId: 'company-a',
        name: 'North Division',
      },
    ]);

    const app = express();
    app.use(
      createOrgTreeRouter({
        requireAuth: (_request, response, next) => {
          response.locals.auth = session;
          next();
        },
        requireRole: () => (_request, _response, next) => next(),
        listOrgTree,
      }),
    );

    const response = await request(app).get('/companies/company-a/org-tree');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        ref: { scopeType: 'division', scopeId: 'division-1' },
        parentRef: { scopeType: 'company', scopeId: 'company-a' },
        companyId: 'company-a',
        name: 'North Division',
      },
    ]);
    expect(listOrgTree).toHaveBeenCalledWith({
      companyId: 'company-a',
      actorUserId: 'user-1',
    });
  });

  it('rejects company access when the actor lacks membership in the requested company', async () => {
    const listOrgTree = vi.fn();

    const app = express();
    app.use(
      createOrgTreeRouter({
        requireAuth: (_request, response, next) => {
          response.locals.auth = session;
          next();
        },
        requireRole: () => (_request, _response, next) => next(),
        listOrgTree,
      }),
    );
    app.use(
      (
        error: unknown,
        _request: express.Request,
        response: express.Response,
        _next: express.NextFunction,
      ) => {
        if (error instanceof ForbiddenError) {
          response.status(403).json({ error: { code: error.code, message: error.message } });
          return;
        }

        response.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected server error' } });
      },
    );

    const response = await request(app).get('/companies/company-b/org-tree');

    expect(response.status).toBe(403);
    expect(listOrgTree).not.toHaveBeenCalled();
  });
});
