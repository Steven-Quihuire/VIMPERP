import { sql } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import { ScopeRefDanglingError, type ScopeHierarchyGateway, type ScopeRef } from '../domain/assignments';
import { scopeRefToScopeNodeId } from './scope-node-id';

type ScopeLineageRow = {
  companyId: string;
  nodeType: string;
  sourceId: string;
  depth: number;
};

const requireOwned = (rows: ScopeLineageRow[], companyId: string) => {
  if (rows.length === 0 || rows[0]?.companyId !== companyId) {
    throw new ScopeRefDanglingError();
  }

  return rows;
};

const toScopeRef = (row: ScopeLineageRow): ScopeRef => {
  return {
    scopeType: row.nodeType as ScopeRef['scopeType'],
    scopeId: row.sourceId,
  };
};

export const buildScopeLineageQuery = (companyId: string, scope: ScopeRef) => {
  const scopeNodeId = scopeRefToScopeNodeId(companyId, scope);

  return sql`
    WITH RECURSIVE scope_lineage AS (
      SELECT
        id,
        node_type,
        source_id,
        company_id,
        parent_scope_node_id,
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
        scope_lineage.depth + 1
      FROM scope_nodes parent
      INNER JOIN scope_lineage ON parent.id = scope_lineage.parent_scope_node_id
    )
    SELECT
      company_id AS "companyId",
      node_type AS "nodeType",
      source_id AS "sourceId",
      depth
    FROM scope_lineage
    ORDER BY depth ASC
  `;
};

const loadScopeLineageRows = async (db: AppDb, companyId: string, scope: ScopeRef) => {
  const result = await db.execute(buildScopeLineageQuery(companyId, scope));
  return requireOwned(result.rows as ScopeLineageRow[], companyId);
};

export const createDrizzleScopeHierarchyGateway = (
  db: AppDb,
): ScopeHierarchyGateway => ({
  assertScopeRefBelongsToCompany: async (companyId, scope) => {
    await loadScopeLineageRows(db, companyId, scope);
  },
  getScopeLineage: async (companyId, scope) => {
    const lineageRows = await loadScopeLineageRows(db, companyId, scope);
    return lineageRows.map(toScopeRef);
  },
});
