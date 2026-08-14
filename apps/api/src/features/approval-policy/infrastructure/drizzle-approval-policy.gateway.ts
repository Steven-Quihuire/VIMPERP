import { randomUUID } from 'node:crypto';

import { and, asc, eq } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  approvalPoliciesTable,
  scopeNodesTable,
} from '../../../shared/infrastructure/db/schema';
import type {
  ApprovalPolicy,
  ApprovalPolicyGateway,
  ApprovalPolicyScopeNode,
} from '../domain/approval-policy';

const toApprovalPolicy = (
  row: typeof approvalPoliciesTable.$inferSelect,
): ApprovalPolicy => ({
  id: row.id,
  companyId: row.companyId,
  scopeType: row.scopeType,
  scopeNodeId: row.scopeNodeId,
  name: row.name,
  definition: row.definition,
  isActive: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toScopeNode = (
  row: typeof scopeNodesTable.$inferSelect,
): ApprovalPolicyScopeNode => ({
  id: row.id,
  companyId: row.companyId,
});

export const createDrizzleApprovalPolicyGateway = (
  db: AppDb,
  {
    createId = randomUUID,
    now = () => new Date(),
  }: {
    createId?: () => string;
    now?: () => Date;
  } = {},
): ApprovalPolicyGateway => ({
  createApprovalPolicy: async (input) => {
    const [row] = await db
      .insert(approvalPoliciesTable)
      .values({
        id: createId(),
        companyId: input.companyId,
        scopeType: input.scopeType,
        scopeNodeId: input.scopeNodeId,
        name: input.name,
        definition: input.definition,
        isActive: input.isActive,
        createdAt: now(),
        updatedAt: now(),
      })
      .returning();

    return toApprovalPolicy(row!);
  },
  listApprovalPolicies: async (companyId) => {
    const rows = await db
      .select()
      .from(approvalPoliciesTable)
      .where(eq(approvalPoliciesTable.companyId, companyId))
      .orderBy(asc(approvalPoliciesTable.createdAt));

    return rows.map(toApprovalPolicy);
  },
  getApprovalPolicyById: async (companyId, policyId) => {
    const [row] = await db
      .select()
      .from(approvalPoliciesTable)
      .where(
        and(
          eq(approvalPoliciesTable.companyId, companyId),
          eq(approvalPoliciesTable.id, policyId),
        ),
      )
      .limit(1);

    return row ? toApprovalPolicy(row) : null;
  },
  updateApprovalPolicy: async (input) => {
    const [row] = await db
      .update(approvalPoliciesTable)
      .set({
        scopeType: input.scopeType,
        scopeNodeId: input.scopeNodeId,
        name: input.name,
        definition: input.definition,
        isActive: input.isActive,
        updatedAt: now(),
      })
      .where(
        and(
          eq(approvalPoliciesTable.companyId, input.companyId),
          eq(approvalPoliciesTable.id, input.policyId),
        ),
      )
      .returning();

    return row ? toApprovalPolicy(row) : null;
  },
  deactivateApprovalPolicy: async (companyId, policyId) => {
    const [row] = await db
      .update(approvalPoliciesTable)
      .set({
        isActive: false,
        updatedAt: now(),
      })
      .where(
        and(
          eq(approvalPoliciesTable.companyId, companyId),
          eq(approvalPoliciesTable.id, policyId),
        ),
      )
      .returning();

    return row ? toApprovalPolicy(row) : null;
  },
  findScopeNode: async (companyId, scopeNodeId) => {
    const [row] = await db
      .select()
      .from(scopeNodesTable)
      .where(and(eq(scopeNodesTable.companyId, companyId), eq(scopeNodesTable.id, scopeNodeId)))
      .limit(1);

    return row ? toScopeNode(row) : null;
  },
});
