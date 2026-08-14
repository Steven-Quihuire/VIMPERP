export const scopeTypeValues = [
  'company',
  'division',
  'local',
  'area',
  'warehouse',
  'point-of-sale',
] as const;

export type ScopeType = (typeof scopeTypeValues)[number];

export type ScopeRef = {
  scopeType: ScopeType;
  scopeId: string;
};

export const assignmentModeValues = ['subtree_inclusive', 'exact_node'] as const;

export type AssignmentMode = (typeof assignmentModeValues)[number];

export type ScopeAssignmentRecord = {
  companyId: string;
  userId: string;
  scope: ScopeRef;
  mode: AssignmentMode;
};

export type ResolvedScopeNode = {
  ref: ScopeRef;
  parentRef: ScopeRef | null;
  companyId: string;
  name: string;
  employeeCount?: number;
};

export type ScopeResolver = {
  getLineage: (companyId: string, scope: ScopeRef) => Promise<ScopeRef[]>;
  isAuthorized: (
    companyId: string,
    userId: string,
    scope: ScopeRef,
  ) => Promise<boolean>;
  listAuthorizedDescendants: (
    companyId: string,
    userId: string,
  ) => Promise<ResolvedScopeNode[]>;
};

export const scopeRefToKey = (scope: ScopeRef) => `${scope.scopeType}:${scope.scopeId}`;

export const isSameScopeRef = (left: ScopeRef, right: ScopeRef) =>
  scopeRefToKey(left) === scopeRefToKey(right);

export const scopeLineageContains = (lineage: ScopeRef[], scope: ScopeRef) => {
  const requestedScope = scopeRefToKey(scope);
  return lineage.some((entry) => scopeRefToKey(entry) === requestedScope);
};

export class ScopeNodeNotFoundError extends Error {
  readonly code = 'SCOPE_NODE_NOT_FOUND';

  constructor(message = 'Scope node not found') {
    super(message);
    this.name = 'ScopeNodeNotFoundError';
  }
}

const buildIndexes = (nodes: ResolvedScopeNode[]) => {
  const nodesByKey = new Map(nodes.map((node) => [scopeRefToKey(node.ref), node]));
  const childrenByParentKey = new Map<string, ResolvedScopeNode[]>();

  for (const node of nodes) {
    if (!node.parentRef) {
      continue;
    }

    const parentKey = scopeRefToKey(node.parentRef);
    const current = childrenByParentKey.get(parentKey) ?? [];
    current.push(node);
    childrenByParentKey.set(parentKey, current);
  }

  return { nodesByKey, childrenByParentKey };
};

export const createInMemoryScopeResolver = ({
  nodes,
  assignments,
}: {
  nodes: ResolvedScopeNode[];
  assignments: ScopeAssignmentRecord[];
}): ScopeResolver => {
  const { nodesByKey, childrenByParentKey } = buildIndexes(nodes);

  const getLineage = async (companyId: string, scope: ScopeRef) => {
    const lineage: ScopeRef[] = [];
    let current: ResolvedScopeNode | undefined = nodesByKey.get(
      scopeRefToKey(scope),
    );

    if (!current || current.companyId !== companyId) {
      throw new ScopeNodeNotFoundError();
    }

    while (current) {
      lineage.push(current.ref);
      current = current.parentRef
        ? nodesByKey.get(scopeRefToKey(current.parentRef))
        : undefined;
    }

    return lineage;
  };

  return {
    getLineage,
    isAuthorized: async (companyId, userId, scope) => {
      const lineage = await getLineage(companyId, scope);
      const userAssignments = assignments.filter(
        (assignment) =>
          assignment.companyId === companyId && assignment.userId === userId,
      );

      return userAssignments.some((assignment) =>
        assignment.mode === 'exact_node'
          ? isSameScopeRef(assignment.scope, scope)
          : scopeLineageContains(lineage, assignment.scope),
      );
    },
    listAuthorizedDescendants: async (companyId, userId) => {
      const userAssignments = assignments.filter(
        (assignment) =>
          assignment.companyId === companyId && assignment.userId === userId,
      );
      const visibleNodes = new Map<string, ResolvedScopeNode>();

      for (const assignment of userAssignments) {
        const rootNode = nodesByKey.get(scopeRefToKey(assignment.scope));

        if (!rootNode || rootNode.companyId !== companyId) {
          continue;
        }

        const queue = [rootNode];

        while (queue.length > 0) {
          const node = queue.shift();

          if (!node) {
            continue;
          }

          visibleNodes.set(scopeRefToKey(node.ref), node);

          if (assignment.mode === 'exact_node') {
            continue;
          }

          const children = childrenByParentKey.get(scopeRefToKey(node.ref)) ?? [];
          queue.push(...children.filter((child) => child.companyId === companyId));
        }
      }

      return [...visibleNodes.values()];
    },
  };
};
