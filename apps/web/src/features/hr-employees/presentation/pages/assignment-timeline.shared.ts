import type { OrgTreeNode } from '@/features/org-tree/domain/org-tree';

export const scopeTypeLabels = {
  company: 'Empresa',
  division: 'División',
  local: 'Local',
  area: 'Área',
  warehouse: 'Almacén',
  'point-of-sale': 'Punto de venta',
} as const;

const scopeKey = (node: { ref: { scopeType: string; scopeId: string } }) =>
  `${node.ref.scopeType}:${node.ref.scopeId}`;

export const getScopeOptions = (nodes: OrgTreeNode[]) => {
  const nodeKeys = new Set(nodes.map(scopeKey));
  const children = new Map<string, typeof nodes>();
  for (const node of nodes) {
    if (!node.parentRef) continue;
    const parentKey = `${node.parentRef.scopeType}:${node.parentRef.scopeId}`;
    children.set(parentKey, [...(children.get(parentKey) ?? []), node]);
  }
  const visit = (
    node: (typeof nodes)[number],
    depth: number,
  ): { node: (typeof nodes)[number]; depth: number }[] => [
    { node, depth },
    ...(children.get(scopeKey(node)) ?? []).flatMap((child) =>
      visit(child, depth + 1),
    ),
  ];
  return nodes
    .filter(
      (node) =>
        !node.parentRef ||
        !nodeKeys.has(`${node.parentRef.scopeType}:${node.parentRef.scopeId}`),
    )
    .flatMap((node) => visit(node, 0));
};
