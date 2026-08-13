import { describe, expect, it } from 'vitest';

import {
  buildNodeResponsibilitySummary,
  getNodeResponsibilityBadgeClassName,
} from './node-responsibility-badge';

describe('node responsibility helpers', () => {
  it('builds active, pending, and empty summaries', () => {
    expect(
      buildNodeResponsibilitySummary({
        activeResponsibility: {
          id: 'resp-1',
          companyId: 'company-1',
          scopeNodeId: 'node-1',
          scopeType: 'local',
          scopeId: 'local-1',
          scopeName: 'Central Store',
          responsibleUserId: 'user-1',
          responsibleUserEmail: 'manager@vimcore.test',
          responsibleUsername: 'manager',
          managedRoleKey: 'node-manager',
          assignmentMode: 'subtree_inclusive',
          baseMembershipRole: 'company-user',
          isActive: true,
          createdAt: '2026-08-13T10:00:00.000Z',
          updatedAt: '2026-08-13T10:00:00.000Z',
          endedAt: null,
        },
      }),
    ).toEqual({
      status: 'active',
      badgeLabel: 'Responsable activo',
      detail: 'manager · manager@vimcore.test',
    });

    expect(
      buildNodeResponsibilitySummary({
        pendingInvitation: {
          id: 'inv-1',
          companyId: 'company-1',
          scopeNodeId: 'node-2',
          scopeType: 'area',
          scopeId: 'area-1',
          scopeName: 'Area Norte',
          inviteeEmail: 'pending@vimcore.test',
          createdAt: '2026-08-13T10:00:00.000Z',
          expiresAt: '2026-08-20T10:00:00.000Z',
        },
      }),
    ).toMatchObject({
      status: 'pending',
      badgeLabel: 'Invitacion pendiente',
    });

    expect(buildNodeResponsibilitySummary({})).toEqual({
      status: 'empty',
      badgeLabel: 'Sin responsable',
      detail: 'Todavia no hay una persona asignada.',
    });
  });

  it('returns badge classes per status', () => {
    expect(getNodeResponsibilityBadgeClassName('active')).toContain('emerald');
    expect(getNodeResponsibilityBadgeClassName('pending')).toContain('amber');
    expect(getNodeResponsibilityBadgeClassName('empty')).toContain('zinc');
  });
});
