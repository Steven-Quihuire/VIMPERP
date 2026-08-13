import { and, eq, sql } from 'drizzle-orm';

import { roleAssignmentsTable, scopeNodesTable } from '../db/schema';
import type { AppDb } from '../db/client';
import {
  isSameScopeRef,
  scopeLineageContains,
  type ResolvedScopeNode,
  type ScopeRef,
  type ScopeResolver,
  ScopeNodeNotFoundError,
} from './scope-hierarchy.port';

type ScopeLineageRow = {
  companyId: string;
  nodeType: ScopeRef['scopeType'];
  sourceId: string;
  parentScopeNodeId: string | null;
  name: string;
  depth: number;
};

const toScopeNodeId = (companyId: string, scope: ScopeRef) => {
  if (scope.scopeType === 'company') {
    if (scope.scopeId !== companyId) {
      throw new ScopeNodeNotFoundError();
    }

    return `company:${scope.scopeId}`;
  }

  return `${scope.scopeType}:${scope.scopeId}`;
};

const toScopeRef = (scopeNodeId: string): ScopeRef => {
  const separatorIndex = scopeNodeId.indexOf(':');

  if (separatorIndex === -1) {
    throw new ScopeNodeNotFoundError(`Malformed scope node id: ${scopeNodeId}`);
  }

  return {
    scopeType: scopeNodeId.slice(0, separatorIndex) as ScopeRef['scopeType'],
    scopeId: scopeNodeId.slice(separatorIndex + 1),
  };
};

const requireOwned = (rows: ScopeLineageRow[], companyId: string) => {
  if (rows.length === 0 || rows[0]?.companyId !== companyId) {
    throw new ScopeNodeNotFoundError();
  }

  return rows;
};

const buildScopeLineageQuery = (companyId: string, scope: ScopeRef) => {
  const scopeNodeId = toScopeNodeId(companyId, scope);

  return sql`
    WITH RECURSIVE scope_lineage AS (
      SELECT
        id,
        node_type,
        source_id,
        company_id,
        parent_scope_node_id,
        name,
        0 AS depth
      FROM scope_nodes
      WHERE id = ${scopeNodeId}

      UNION ALL

      SELECT
        parent.id,
        parent.node_type,
        parent.source_id,
        parent.company_id,
        parent.parent_scope_node_id,
        parent.name,
        scope_lineage.depth + 1
      FROM scope_nodes parent
      INNER JOIN scope_lineage ON parent.id = scope_lineage.parent_scope_node_id
    )
    SELECT
      company_id AS "companyId",
      node_type AS "nodeType",
      source_id AS "sourceId",
      parent_scope_node_id AS "parentScopeNodeId",
      name,
      depth
    FROM scope_lineage
    ORDER BY depth ASC
  `;
};

const loadScopeLineageRows = async (db: AppDb, companyId: string, scope: ScopeRef) => {
  const result = await db.execute(buildScopeLineageQuery(companyId, scope));
  return requireOwned(result.rows as ScopeLineageRow[], companyId);
};

const toResolvedScopeNode = (row: ScopeLineageRow): ResolvedScopeNode => ({
  ref: {
    scopeType: row.nodeType,
    scopeId: row.sourceId,
  },
  parentRef: row.parentScopeNodeId ? toScopeRef(row.parentScopeNodeId) : null,
  companyId: row.companyId,
  name: row.name,
});

export const createDrizzleScopeResolver = (db: AppDb): ScopeResolver => ({
  getLineage: async (companyId, scope) => {
    const lineageRows = await loadScopeLineageRows(db, companyId, scope);
    return lineageRows.map((row) => ({
      scopeType: row.nodeType,
      scopeId: row.sourceId,
    }));
  },
  isAuthorized: async (companyId, userId, scope) => {
    const [lineage, assignments] = await Promise.all([
      loadScopeLineageRows(db, companyId, scope),
      db
        .select({
          scopeType: roleAssignmentsTable.scopeType,
          scopeId: roleAssignmentsTable.scopeId,
          mode: roleAssignmentsTable.mode,
        })
        .from(roleAssignmentsTable)
        .where(
          and(
            eq(roleAssignmentsTable.companyId, companyId),
            eq(roleAssignmentsTable.userId, userId),
          ),
        ),
    ]);

    const lineageRefs = lineage.map((row) => ({
      scopeType: row.nodeType,
      scopeId: row.sourceId,
    }));

    return assignments.some((assignment) => {
      const assignmentScope: ScopeRef = {
        scopeType: assignment.scopeType,
        scopeId: assignment.scopeId,
      };

      return assignment.mode === 'exact_node'
        ? isSameScopeRef(assignmentScope, scope)
        : scopeLineageContains(lineageRefs, assignmentScope);
    });
  },
  listAuthorizedDescendants: async (companyId, userId) => {
    const assignments = await db
      .select({
        scopeNodeId: roleAssignmentsTable.scopeNodeId,
        mode: roleAssignmentsTable.mode,
      })
      .from(roleAssignmentsTable)
      .where(
        and(
          eq(roleAssignmentsTable.companyId, companyId),
          eq(roleAssignmentsTable.userId, userId),
        ),
      );

    const visibleNodes = new Map<string, ResolvedScopeNode>();

    for (const assignment of assignments) {
      const rootRows = await db
        .select({
          id: scopeNodesTable.id,
          companyId: scopeNodesTable.companyId,
          nodeType: scopeNodesTable.nodeType,
          sourceId: scopeNodesTable.sourceId,
          parentScopeNodeId: scopeNodesTable.parentScopeNodeId,
          name: scopeNodesTable.name,
        })
        .from(scopeNodesTable)
        .where(eq(scopeNodesTable.id, assignment.scopeNodeId))
        .limit(1);

      const root = rootRows[0];

      if (!root || root.companyId !== companyId) {
        continue;
      }

      visibleNodes.set(root.id, {
        ref: { scopeType: root.nodeType, scopeId: root.sourceId },
        parentRef: root.parentScopeNodeId ? toScopeRef(root.parentScopeNodeId) : null,
        companyId: root.companyId,
        name: root.name,
      });

      if (assignment.mode === 'exact_node') {
        continue;
      }

      const result = await db.execute(sql`
        WITH RECURSIVE scope_descendants AS (
          SELECT
            id,
            node_type,
            source_id,
            company_id,
            parent_scope_node_id,
            name,
            created_at
          FROM scope_nodes
          WHERE id = ${assignment.scopeNodeId}

          UNION ALL

          SELECT
            child.id,
            child.node_type,
            child.source_id,
            child.company_id,
            child.parent_scope_node_id,
            child.name,
            child.created_at
          FROM scope_nodes child
          INNER JOIN scope_descendants current
            ON child.parent_scope_node_id = current.id
        )
        SELECT
          id,
          company_id AS "companyId",
          node_type AS "nodeType",
          source_id AS "sourceId",
          parent_scope_node_id AS "parentScopeNodeId",
          name,
          0 AS depth
        FROM scope_descendants
        WHERE company_id = ${companyId}
      `);

      for (const row of result.rows as ScopeLineageRow[]) {
        visibleNodes.set(`${row.nodeType}:${row.sourceId}`, toResolvedScopeNode(row));
      }
    }

    return [...visibleNodes.values()];
  },
});
