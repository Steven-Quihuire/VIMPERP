import '@xyflow/react/dist/style.css';

import dagre from '@dagrejs/dagre';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react';
import {
  Box,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Map,
  Network,
  Pencil,
  PencilSparkles,
  Plus,
  ShoppingBasket,
  Store,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { sileo } from 'sileo';

import { HttpError } from '@/shared/lib/http/http-client';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/ui/field';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/shared/ui/hover-card';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import type { AuthSession } from '../../auth/domain/auth';
import { useDashboardCurrentCompany } from '../../dashboard/presentation/use-dashboard';
import {
  useCreateNodeManagementInvitation,
  useNodeManagementPendingInvitations,
  useNodeManagementResponsibilities,
} from '../../node-management/application/node-management-queries';
import type {
  CreatedNodeManagementInvitation,
  NodeResponsibilitySummary,
  NodeManagementScopeType,
} from '../../node-management/domain/node-management';
import {
  buildNodeResponsibilitySummary,
  getNodeResponsibilityBadgeClassName,
} from '../../node-management/presentation/node-responsibility-badge';
import {
  useAreas,
  useCreateArea,
  useCreateDivision,
  useCreateLocal,
  useCreatePointOfSale,
  useCreateWarehouse,
  useDeleteArea,
  useDeleteDivision,
  useDeleteLocal,
  useDeletePointOfSale,
  useDeleteWarehouse,
  useDivisions,
  useLocals,
  usePointsOfSale,
  useUpdateArea,
  useUpdateDivision,
  useUpdateLocal,
  useUpdatePointOfSale,
  useUpdateWarehouse,
  useWarehouses,
} from '../application/org-hierarchy-queries';
import type {
  Area,
  Division,
  Local,
  PointOfSale,
  Warehouse,
} from '../domain/org-hierarchy';

type OrgEntityKind =
  'company' | 'division' | 'local' | 'area' | 'warehouse' | 'point-of-sale';

type ParentKind = 'company' | 'division' | 'local' | 'area';

type CreateDialogState = {
  mode: 'create';
  parentKind: ParentKind;
  parentId: string;
  initialKind?: Exclude<OrgEntityKind, 'company'>;
};

type EditDialogState = {
  mode: 'edit';
  kind: Exclude<OrgEntityKind, 'company'>;
  entityId: string;
};

type DeleteDialogState = {
  kind: Exclude<OrgEntityKind, 'company'>;
  entityId: string;
};

type OrganizationDialogState = CreateDialogState | EditDialogState;

type OrganizationGraphNodeData = {
  id: string;
  kind: OrgEntityKind;
  label: string;
  meta: string | null;
  responsibility: NodeResponsibilitySummary;
  canAddChildren: boolean;
  isDropTarget?: boolean;
  onCreateChild: (nodeId: string, kind: OrgEntityKind) => void;
  onEdit: (nodeId: string, kind: OrgEntityKind) => void;
  onDelete: (nodeId: string, kind: OrgEntityKind) => void;
};

type OrganizationCanvasNode = Node<
  OrganizationGraphNodeData,
  'organization-node'
>;
type BranchNodeData = { label: string };
type BranchCanvasNode = Node<BranchNodeData, 'branch-label'>;
type OrganizationFlowNode = OrganizationCanvasNode | BranchCanvasNode;
type OrganizationCanvasEdge = Edge & {
  className?: string;
  animated?: boolean;
  sourcePosition?: Position;
  targetPosition?: Position;
};

const isOrganizationNode = (
  node: OrganizationFlowNode,
): node is OrganizationCanvasNode => node.type === 'organization-node';

type GraphEntry = {
  id: string;
  parentId: string | null;
  kind: OrgEntityKind;
  label: string;
  meta: string | null;
  scopeType: NodeManagementScopeType;
  scopeId: string;
  responsibility: NodeResponsibilitySummary;
};

const getScopeKey = (scopeType: NodeManagementScopeType, scopeId: string) =>
  `${scopeType}:${scopeId}`;

const ROOT_NODE_ID = 'company-root';
const NO_PARENT = '__none__';
const NODE_WIDTH = 286;
const NODE_HEIGHT_FALLBACK = 178;
const BRANCH_WIDTH_FALLBACK = 112;
const BRANCH_HEIGHT_FALLBACK = 28;
const LAYOUT_READY_FALLBACK_MS = 1200;

const kindLabel: Record<OrgEntityKind, string> = {
  company: 'Empresa',
  division: 'División',
  local: 'Local',
  area: 'Área',
  warehouse: 'Almacén',
  'point-of-sale': 'Punto de venta',
};

const kindIcon: Record<OrgEntityKind, typeof Building2> = {
  company: Building2,
  division: Network,
  local: Store,
  area: Map,
  warehouse: Box,
  'point-of-sale': ShoppingBasket,
};

const kindTone: Record<OrgEntityKind, string> = {
  company: 'bg-zinc-950 text-white border-zinc-950',
  division: 'bg-violet-100 text-violet-950 border-violet-200',
  local: 'bg-sky-100 text-sky-950 border-sky-200',
  area: 'bg-emerald-100 text-emerald-950 border-emerald-200',
  warehouse: 'bg-amber-100 text-amber-950 border-amber-200',
  'point-of-sale': 'bg-rose-100 text-rose-950 border-rose-200',
};

const getCreatableKinds = (
  parentKind: ParentKind,
): Exclude<OrgEntityKind, 'company'>[] => {
  switch (parentKind) {
    case 'company':
      return ['division', 'local'];
    case 'division':
      return ['local', 'area'];
    case 'local':
      return ['area', 'warehouse', 'point-of-sale'];
    case 'area':
      return ['warehouse', 'point-of-sale'];
  }
};

const getDefaultKind = (
  state: CreateDialogState,
): Exclude<OrgEntityKind, 'company'> => {
  const availableKinds = getCreatableKinds(state.parentKind);
  return state.initialKind ?? availableKinds[0] ?? 'local';
};

const getEntityErrorMessage = (
  kind: Exclude<OrgEntityKind, 'company'>,
  error: unknown,
) => {
  if (error instanceof HttpError && error.status === 409) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return `No se pudo guardar ${kindLabel[kind].toLowerCase()}.`;
};

const getDeleteErrorMessage = (
  kind: Exclude<OrgEntityKind, 'company'>,
  error: unknown,
) => {
  if (error instanceof HttpError && error.status === 409) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return `No se pudo eliminar ${kindLabel[kind].toLowerCase()}.`;
};

const getInvitationErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'El nodo fue creado, pero no se pudo generar la invitación del responsable.';
};

const notifyInvitationDelivery = (invitation: CreatedNodeManagementInvitation) => {
  const description = (() => {
    if (!invitation.delivery || invitation.delivery.status === 'sent') {
      return `Invitation email sent to ${invitation.inviteeEmail}.`;
    }

    if (invitation.delivery.status === 'skipped') {
      return invitation.delivery.message
        ? `Invitation created for ${invitation.inviteeEmail}, but email delivery was skipped: ${invitation.delivery.message}`
        : `Invitation created for ${invitation.inviteeEmail}, but email delivery was skipped.`;
    }

    return invitation.delivery.message
      ? `Invitation created for ${invitation.inviteeEmail}, but email delivery failed: ${invitation.delivery.message}`
      : `Invitation created for ${invitation.inviteeEmail}, but email delivery failed.`;
  })();

  if (!invitation.delivery || invitation.delivery.status === 'sent') {
    sileo.success({ description, position: 'bottom-right', duration: 2400 });
    return;
  }

  sileo.warning({ description, position: 'bottom-right', duration: 3600 });
};

const getGraphEntries = ({
  companyId,
  companyName,
  responsibilitiesByScope,
  divisions,
  locals,
  areas,
  warehouses,
  pointsOfSale,
}: {
  companyId: string;
  companyName: string;
  responsibilitiesByScope: Map<string, NodeResponsibilitySummary>;
  divisions: Division[];
  locals: Local[];
  areas: Area[];
  warehouses: Warehouse[];
  pointsOfSale: PointOfSale[];
}) =>
  [
    {
      id: ROOT_NODE_ID,
      parentId: null,
      kind: 'company' as const,
      label: companyName,
      meta: `${divisions.length} divisiones · ${locals.length} locales`,
      scopeType: 'company' as const,
      scopeId: companyId,
      responsibility:
        responsibilitiesByScope.get(getScopeKey('company', companyId)) ??
        buildNodeResponsibilitySummary({}),
    },
    ...divisions.map((division) => ({
      id: division.id,
      parentId: ROOT_NODE_ID,
      kind: 'division' as const,
      label: division.name,
      meta: 'Gestiona locales y áreas bajo esta división.',
      scopeType: 'division' as const,
      scopeId: division.id,
      responsibility:
        responsibilitiesByScope.get(getScopeKey('division', division.id)) ??
        buildNodeResponsibilitySummary({}),
    })),
    ...locals.map((local) => ({
      id: local.id,
      parentId: local.divisionId ?? ROOT_NODE_ID,
      kind: 'local' as const,
      label: local.name,
      meta: local.divisionId
        ? 'Local dependiente de una división.'
        : 'Local creado directamente bajo empresa.',
      scopeType: 'local' as const,
      scopeId: local.id,
      responsibility:
        responsibilitiesByScope.get(getScopeKey('local', local.id)) ??
        buildNodeResponsibilitySummary({}),
    })),
    ...areas.map((area) => ({
      id: area.id,
      parentId: area.divisionId ?? area.localId,
      kind: 'area' as const,
      label: area.name,
      meta: area.divisionId
        ? 'Área asociada a una división.'
        : 'Área asociada a un local.',
      scopeType: 'area' as const,
      scopeId: area.id,
      responsibility:
        responsibilitiesByScope.get(getScopeKey('area', area.id)) ??
        buildNodeResponsibilitySummary({}),
    })),
    ...warehouses.map((warehouse) => ({
      id: warehouse.id,
      parentId: warehouse.areaId ?? warehouse.localId,
      kind: 'warehouse' as const,
      label: warehouse.name,
      meta: warehouse.areaId
        ? 'Almacén dependiente de un área.'
        : 'Almacén dependiente de un local.',
      scopeType: 'warehouse' as const,
      scopeId: warehouse.id,
      responsibility:
        responsibilitiesByScope.get(getScopeKey('warehouse', warehouse.id)) ??
        buildNodeResponsibilitySummary({}),
    })),
    ...pointsOfSale.map((pointOfSale) => ({
      id: pointOfSale.id,
      parentId: pointOfSale.areaId ?? pointOfSale.localId,
      kind: 'point-of-sale' as const,
      label: pointOfSale.name,
      meta: pointOfSale.areaId
        ? 'Punto de venta dependiente de un área.'
        : 'Punto de venta dependiente de un local.',
      scopeType: 'point-of-sale' as const,
      scopeId: pointOfSale.id,
      responsibility:
        responsibilitiesByScope.get(getScopeKey('point-of-sale', pointOfSale.id)) ??
        buildNodeResponsibilitySummary({}),
    })),
  ] satisfies GraphEntry[];

const getAllowedParentKinds = (
  kind: Exclude<OrgEntityKind, 'company'>,
): ParentKind[] => {
  switch (kind) {
    case 'division':
      return [];
    case 'local':
      return ['company', 'division'];
    case 'area':
      return ['division', 'local'];
    case 'warehouse':
    case 'point-of-sale':
      return ['area', 'local'];
  }
};

const resolveGraphParentKind = (kind: OrgEntityKind): ParentKind | null => {
  if (
    kind === 'company' ||
    kind === 'division' ||
    kind === 'local' ||
    kind === 'area'
  ) {
    return kind;
  }

  return null;
};

const getValidDropTarget = ({
  draggedNode,
  intersectingNodes,
}: {
  draggedNode: OrganizationCanvasNode;
  intersectingNodes: OrganizationCanvasNode[];
}) => {
  if (
    draggedNode.data.kind === 'company' ||
    draggedNode.data.kind === 'division'
  ) {
    return null;
  }

  const allowedParentKinds = getAllowedParentKinds(draggedNode.data.kind);

  return (
    intersectingNodes.find((candidateNode) => {
      if (candidateNode.id === draggedNode.id) {
        return false;
      }

      const candidateKind = resolveGraphParentKind(candidateNode.data.kind);
      return candidateKind ? allowedParentKinds.includes(candidateKind) : false;
    }) ?? null
  );
};

const getMovementPayload = ({
  draggedNode,
  targetNode,
}: {
  draggedNode: OrganizationCanvasNode;
  targetNode: OrganizationCanvasNode;
}) => {
  if (draggedNode.data.kind === 'local') {
    return targetNode.data.kind === 'division'
      ? {
          kind: 'local' as const,
          payload: { localId: draggedNode.id, divisionId: targetNode.id },
        }
      : {
          kind: 'local' as const,
          payload: { localId: draggedNode.id, divisionId: null },
        };
  }

  if (draggedNode.data.kind === 'area') {
    return targetNode.data.kind === 'division'
      ? {
          kind: 'area' as const,
          payload: { areaId: draggedNode.id, divisionId: targetNode.id },
        }
      : {
          kind: 'area' as const,
          payload: { areaId: draggedNode.id, localId: targetNode.id },
        };
  }

  if (draggedNode.data.kind === 'warehouse') {
    return targetNode.data.kind === 'area'
      ? {
          kind: 'warehouse' as const,
          payload: { warehouseId: draggedNode.id, areaId: targetNode.id },
        }
      : {
          kind: 'warehouse' as const,
          payload: { warehouseId: draggedNode.id, localId: targetNode.id },
        };
  }

  if (draggedNode.data.kind === 'point-of-sale') {
    return targetNode.data.kind === 'area'
      ? {
          kind: 'point-of-sale' as const,
          payload: { pointOfSaleId: draggedNode.id, areaId: targetNode.id },
        }
      : {
          kind: 'point-of-sale' as const,
          payload: { pointOfSaleId: draggedNode.id, localId: targetNode.id },
        };
  }

  return null;
};

const getNodeDimensions = (node: OrganizationFlowNode) => {
  if (node.type === 'branch-label') {
    return {
      width: node.measured?.width ?? node.width ?? BRANCH_WIDTH_FALLBACK,
      height: node.measured?.height ?? node.height ?? BRANCH_HEIGHT_FALLBACK,
    };
  }

  return {
    width: node.measured?.width ?? node.width ?? NODE_WIDTH,
    height: node.measured?.height ?? node.height ?? NODE_HEIGHT_FALLBACK,
  };
};

const getLayoutedElements = (
  inputNodes: OrganizationFlowNode[],
  inputEdges: OrganizationCanvasEdge[],
) => {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  graph.setGraph({
    rankdir: 'TB',
    nodesep: 144,
    ranksep: 88,
    edgesep: 48,
    marginx: 120,
    marginy: 112,
  });

  inputNodes.forEach((node) => {
    const { width, height } = getNodeDimensions(node);
    graph.setNode(node.id, { width, height });
  });

  inputEdges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return inputNodes.map((node) => {
    const { width, height } = getNodeDimensions(node);
    const position = graph.node(node.id) as { x: number; y: number };

    return {
      ...node,
      position: {
        x: position.x - width / 2,
        y: position.y - height / 2,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });
};

const buildFlowGraph = ({
  entries,
  onCreateChild,
  onEdit,
  onDelete,
}: {
  entries: GraphEntry[];
  onCreateChild: (nodeId: string, kind: OrgEntityKind) => void;
  onEdit: (nodeId: string, kind: OrgEntityKind) => void;
  onDelete: (nodeId: string, kind: OrgEntityKind) => void;
}) => {
  const organizationNodes: OrganizationCanvasNode[] = entries.map((entry) => ({
    id: entry.id,
    type: 'organization-node',
    position: { x: 0, y: 0 },
    style: {
      transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
    },
    data: {
      id: entry.id,
      kind: entry.kind,
      label: entry.label,
      meta: entry.meta,
      responsibility: entry.responsibility,
      canAddChildren:
        entry.kind !== 'warehouse' && entry.kind !== 'point-of-sale',
      isDropTarget: false,
      onCreateChild,
      onEdit,
      onDelete,
    },
  }));

  const childrenByParent = new globalThis.Map<string, GraphEntry[]>();
  for (const entry of entries) {
    if (!entry.parentId) continue;
    const children = childrenByParent.get(entry.parentId) ?? [];
    children.push(entry);
    childrenByParent.set(entry.parentId, children);
  }

  const branchNodes: BranchCanvasNode[] = [];
  const edges: OrganizationCanvasEdge[] = [];

  for (const [parentId, children] of childrenByParent.entries()) {
    const groups = new globalThis.Map<OrgEntityKind, GraphEntry[]>();
    for (const child of children) {
      const group = groups.get(child.kind) ?? [];
      group.push(child);
      groups.set(child.kind, group);
    }

    for (const [kind, group] of groups.entries()) {
      const branchId = `${parentId}-branch-${kind}`;

      branchNodes.push({
        id: branchId,
        type: 'branch-label',
        position: { x: 0, y: 0 },
        width: BRANCH_WIDTH_FALLBACK,
        height: BRANCH_HEIGHT_FALLBACK,
        draggable: false,
        selectable: false,
        data: { label: kindLabel[kind] },
      });

      edges.push({
        id: `${parentId}-${branchId}`,
        source: parentId,
        target: branchId,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        style: { stroke: 'rgba(115,115,115,0.6)', strokeWidth: 1.6 },
      });

      for (const child of group) {
        edges.push({
          id: `${branchId}-${child.id}`,
          source: branchId,
          target: child.id,
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
          style: { stroke: 'rgba(115,115,115,0.6)', strokeWidth: 1.6 },
        });
      }
    }
  }

  return { nodes: [...organizationNodes, ...branchNodes] as OrganizationFlowNode[], edges };
};

const BranchLabelNode = ({ data }: NodeProps<BranchCanvasNode>) => (
  <>
    <Handle type="target" position={Position.Top} className="!opacity-0" />
    <div className="flex h-full w-full items-center justify-center rounded-full bg-background/80 px-3 py-1 text-center text-[11px] font-semibold uppercase leading-none tracking-[0.18em] text-muted-foreground shadow-sm backdrop-blur">
      {data.label}
    </div>
    <Handle type="source" position={Position.Bottom} className="!opacity-0" />
  </>
);

const OrganizationNodeComponent = ({
  data,
}: NodeProps<OrganizationCanvasNode>) => {
  const Icon = kindIcon[data.kind];
  const isCompanyNode = data.kind === 'company';

  return (
    <>
      {data.kind !== 'company' ? (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={false}
          className="!size-2 !border-0 !bg-zinc-400"
        />
      ) : null}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="!size-2 !border-0 !bg-zinc-400"
      />

      <div className="flex flex-col items-center">
        <div
          className={`w-[286px] cursor-grab rounded-[28px] border p-4 shadow-[0_30px_90px_-52px_rgba(0,0,0,0.55)] backdrop-blur transition-all active:cursor-grabbing ${
            data.isDropTarget
              ? 'border-emerald-400 bg-emerald-50/95 ring-2 ring-emerald-300/60'
              : 'border-border/80 bg-background/96'
          }`}
        >
          <div className="flex items-start gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border ${kindTone[data.kind]}`}
            >
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              {!isCompanyNode ? (
                <Badge
                  variant="outline"
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                >
                  {kindLabel[data.kind]}
                </Badge>
              ) : null}
              <div>
                <p className="truncate text-sm font-semibold text-foreground">
                  {data.label}
                </p>
                {data.meta ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {data.meta}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge
                  variant="outline"
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getNodeResponsibilityBadgeClassName(data.responsibility.status)}`}
                >
                  {data.responsibility.badgeLabel}
                </Badge>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {data.responsibility.detail}
                </p>
              </div>
              {isCompanyNode ? (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                  <span className="relative flex size-2.5" aria-hidden="true">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                  </span>
                  Activa
                </div>
              ) : null}
            </div>
          </div>
        </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isCompanyNode ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="nodrag size-9 rounded-full bg-white/65 shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white"
                onClick={() => data.onCreateChild(data.id, data.kind)}
                aria-label="Agregar hijo a Empresa"
              >
                <Plus className="size-4" />
              </Button>
            ) : null}
            {!isCompanyNode && data.canAddChildren ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="nodrag size-9 rounded-full bg-white/65 shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white"
                onClick={() => data.onCreateChild(data.id, data.kind)}
                aria-label={`Agregar hijo a ${data.label}`}
              >
                <Plus className="size-4" />
              </Button>
            ) : null}
            {!isCompanyNode ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="nodrag size-9 rounded-full bg-white/45 shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white"
                onClick={() => data.onEdit(data.id, data.kind)}
                aria-label={`Editar ${data.label}`}
              >
                <Pencil className="size-4" />
              </Button>
            ) : null}
            {!isCompanyNode ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="nodrag size-9 rounded-full bg-red-50/70 text-destructive shadow-sm backdrop-blur transition hover:scale-105 hover:bg-red-100 hover:text-destructive"
                onClick={() => data.onDelete(data.id, data.kind)}
                aria-label={`Eliminar ${data.label}`}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

const nodeTypes = {
  'organization-node': OrganizationNodeComponent,
  'branch-label': BranchLabelNode,
};

const OrganizationEntityDialog = ({
  state,
  onOpenChange,
  companyId,
  divisions,
  locals,
  areas,
  warehouses,
  pointsOfSale,
}: {
  state: OrganizationDialogState;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  divisions: Division[];
  locals: Local[];
  areas: Area[];
  warehouses: Warehouse[];
  pointsOfSale: PointOfSale[];
}) => {
  const createDivision = useCreateDivision();
  const updateDivision = useUpdateDivision(companyId);
  const createLocal = useCreateLocal();
  const updateLocal = useUpdateLocal(companyId);
  const createArea = useCreateArea();
  const updateArea = useUpdateArea(companyId);
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse(companyId);
  const createPointOfSale = useCreatePointOfSale();
  const updatePointOfSale = useUpdatePointOfSale(companyId);
  const createInvitation = useCreateNodeManagementInvitation();

  const selectedDivision =
    state.mode === 'edit' && state.kind === 'division'
      ? (divisions.find((division) => division.id === state.entityId) ?? null)
      : null;
  const selectedLocal =
    state.mode === 'edit' && state.kind === 'local'
      ? (locals.find((local) => local.id === state.entityId) ?? null)
      : null;
  const selectedArea =
    state.mode === 'edit' && state.kind === 'area'
      ? (areas.find((area) => area.id === state.entityId) ?? null)
      : null;
  const selectedWarehouse =
    state.mode === 'edit' && state.kind === 'warehouse'
      ? (warehouses.find((warehouse) => warehouse.id === state.entityId) ??
        null)
      : null;
  const selectedPointOfSale =
    state.mode === 'edit' && state.kind === 'point-of-sale'
      ? (pointsOfSale.find(
          (pointOfSale) => pointOfSale.id === state.entityId,
        ) ?? null)
      : null;

  const initialKind: Exclude<OrgEntityKind, 'company'> =
    state.mode === 'create' ? getDefaultKind(state) : state.kind;

  const [kind, setKind] =
    useState<Exclude<OrgEntityKind, 'company'>>(initialKind);
  const [name, setName] = useState(
    selectedDivision?.name ??
      selectedLocal?.name ??
      selectedArea?.name ??
      selectedWarehouse?.name ??
      selectedPointOfSale?.name ??
      '',
  );
  const [divisionId, setDivisionId] = useState(
    selectedLocal?.divisionId ??
      (state.mode === 'create' && state.parentKind === 'division'
        ? state.parentId
        : NO_PARENT),
  );
  const [areaParentType, setAreaParentType] = useState<'division' | 'local'>(
    selectedArea?.divisionId
      ? 'division'
      : state.mode === 'create' && state.parentKind === 'division'
        ? 'division'
        : 'local',
  );
  const [areaParentId, setAreaParentId] = useState(
    selectedArea?.divisionId ??
      selectedArea?.localId ??
      (state.mode === 'create' &&
      (state.parentKind === 'division' || state.parentKind === 'local')
        ? state.parentId
        : NO_PARENT),
  );
  const [storageParentType, setStorageParentType] = useState<'area' | 'local'>(
    selectedWarehouse?.areaId || selectedPointOfSale?.areaId
      ? 'area'
      : state.mode === 'create' && state.parentKind === 'area'
        ? 'area'
        : 'local',
  );
  const [storageParentId, setStorageParentId] = useState(
    selectedWarehouse?.areaId ??
      selectedWarehouse?.localId ??
      selectedPointOfSale?.areaId ??
      selectedPointOfSale?.localId ??
      (state.mode === 'create' &&
      (state.parentKind === 'area' || state.parentKind === 'local')
        ? state.parentId
        : NO_PARENT),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [responsibleEmail, setResponsibleEmail] = useState('');
  const [createdInviteTarget, setCreatedInviteTarget] = useState<{
    scopeType: NodeManagementScopeType;
    scopeId: string;
  } | null>(null);
  const [invitationResult, setInvitationResult] =
    useState<CreatedNodeManagementInvitation | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  const isPending =
    createDivision.isPending ||
    updateDivision.isPending ||
    createLocal.isPending ||
    updateLocal.isPending ||
    createArea.isPending ||
    updateArea.isPending ||
    createWarehouse.isPending ||
    updateWarehouse.isPending ||
    createPointOfSale.isPending ||
    updatePointOfSale.isPending ||
    createInvitation.isPending;

  const submissionError =
    createDivision.error ??
    updateDivision.error ??
    createLocal.error ??
    updateLocal.error ??
    createArea.error ??
    updateArea.error ??
    createWarehouse.error ??
    updateWarehouse.error ??
    createPointOfSale.error ??
    updatePointOfSale.error;

  const isCreateMode = state.mode === 'create';
  const canEditCreateFields = !createdInviteTarget;

  const creatableKinds = isCreateMode ? getCreatableKinds(state.parentKind) : [];
  const Surface = isCreateMode ? Sheet : Dialog;
  const SurfaceContent = isCreateMode ? SheetContent : DialogContent;
  const SurfaceHeader = isCreateMode ? SheetHeader : DialogHeader;
  const SurfaceTitle = isCreateMode ? SheetTitle : DialogTitle;
  const SurfaceDescription =
    isCreateMode ? SheetDescription : DialogDescription;
  const SurfaceFooter = isCreateMode ? SheetFooter : DialogFooter;
  const SurfaceClose = isCreateMode ? SheetClose : DialogClose;

  const handleSubmit = async () => {
    const trimmedEmail = responsibleEmail.trim().toLowerCase();

    if (createdInviteTarget) {
      if (!trimmedEmail) {
        setInvitationError('Ingresá un correo para generar la invitación.');
        return;
      }

      try {
        const invitation = await createInvitation.mutateAsync({
          companyId,
          scopeType: createdInviteTarget.scopeType,
          scopeId: createdInviteTarget.scopeId,
          inviteeEmail: trimmedEmail,
        });
        setInvitationResult(invitation);
        setInvitationError(null);
        notifyInvitationDelivery(invitation);
        onOpenChange(false);
      } catch (error) {
        setInvitationError(getInvitationErrorMessage(error));
      }

      return;
    }

    const trimmed = name.trim();

    if (trimmed.length === 0) {
      setValidationError('El nombre es obligatorio.');
      return;
    }

    try {
      let createdNodeTarget: {
        scopeType: NodeManagementScopeType;
        scopeId: string;
      } | null = null;

      if (kind === 'division') {
        if (state.mode === 'edit' && selectedDivision) {
          await updateDivision.mutateAsync({
            divisionId: selectedDivision.id,
            name: trimmed,
          });
        } else {
          const division = await createDivision.mutateAsync({ companyId, name: trimmed });
          createdNodeTarget = { scopeType: 'division', scopeId: division.id };
        }
      }

      if (kind === 'local') {
        const resolvedDivisionId = divisionId === NO_PARENT ? null : divisionId;

        if (state.mode === 'edit' && selectedLocal) {
          await updateLocal.mutateAsync({
            localId: selectedLocal.id,
            name: trimmed,
            divisionId: resolvedDivisionId,
          });
        } else {
          const local = await createLocal.mutateAsync({
            companyId,
            name: trimmed,
            divisionId: resolvedDivisionId,
          });
          createdNodeTarget = { scopeType: 'local', scopeId: local.id };
        }
      }

      if (kind === 'area') {
        if (areaParentId === NO_PARENT) {
          setValidationError('Debes elegir un padre para el área.');
          return;
        }

        if (state.mode === 'edit' && selectedArea) {
          await updateArea.mutateAsync(
            areaParentType === 'division'
              ? {
                  areaId: selectedArea.id,
                  name: trimmed,
                  divisionId: areaParentId,
                }
              : {
                  areaId: selectedArea.id,
                  name: trimmed,
                  localId: areaParentId,
                },
          );
        } else {
          const area = await createArea.mutateAsync(
            areaParentType === 'division'
              ? { companyId, name: trimmed, divisionId: areaParentId }
              : { companyId, name: trimmed, localId: areaParentId },
          );
          createdNodeTarget = { scopeType: 'area', scopeId: area.id };
        }
      }

      if (kind === 'warehouse') {
        if (storageParentId === NO_PARENT) {
          setValidationError('Debes elegir un padre para el almacén.');
          return;
        }

        if (state.mode === 'edit' && selectedWarehouse) {
          await updateWarehouse.mutateAsync(
            storageParentType === 'area'
              ? {
                  warehouseId: selectedWarehouse.id,
                  name: trimmed,
                  areaId: storageParentId,
                }
              : {
                  warehouseId: selectedWarehouse.id,
                  name: trimmed,
                  localId: storageParentId,
                },
          );
        } else {
          const warehouse = await createWarehouse.mutateAsync(
            storageParentType === 'area'
              ? { companyId, name: trimmed, areaId: storageParentId }
              : { companyId, name: trimmed, localId: storageParentId },
          );
          createdNodeTarget = { scopeType: 'warehouse', scopeId: warehouse.id };
        }
      }

      if (kind === 'point-of-sale') {
        if (storageParentId === NO_PARENT) {
          setValidationError('Debes elegir un padre para el punto de venta.');
          return;
        }

        if (state.mode === 'edit' && selectedPointOfSale) {
          await updatePointOfSale.mutateAsync(
            storageParentType === 'area'
              ? {
                  pointOfSaleId: selectedPointOfSale.id,
                  name: trimmed,
                  areaId: storageParentId,
                }
              : {
                  pointOfSaleId: selectedPointOfSale.id,
                  name: trimmed,
                  localId: storageParentId,
                },
          );
        } else {
          const pointOfSale = await createPointOfSale.mutateAsync(
            storageParentType === 'area'
              ? { companyId, name: trimmed, areaId: storageParentId }
              : { companyId, name: trimmed, localId: storageParentId },
          );
          createdNodeTarget = { scopeType: 'point-of-sale', scopeId: pointOfSale.id };
        }
      }

      if (isCreateMode && trimmedEmail && createdNodeTarget) {
        try {
          const invitation = await createInvitation.mutateAsync({
            companyId,
            scopeType: createdNodeTarget.scopeType,
            scopeId: createdNodeTarget.scopeId,
            inviteeEmail: trimmedEmail,
          });
          setInvitationResult(invitation);
          setInvitationError(null);
          notifyInvitationDelivery(invitation);
        } catch (error) {
          setCreatedInviteTarget(createdNodeTarget);
          setInvitationResult(null);
          setInvitationError(getInvitationErrorMessage(error));
          return;
        }
      }

      onOpenChange(false);
    } catch {
      // Mutation state renders feedback.
    }
  };

  return (
    <Surface open onOpenChange={onOpenChange}>
        <SurfaceContent
          className={
            isCreateMode
              ? '!h-auto max-h-[min(720px,100dvh)] w-full gap-0 overflow-y-auto p-0 sm:max-w-md'
              : undefined
          }
        >
        <SurfaceHeader
          className={isCreateMode ? 'p-5 pb-2' : undefined}
        >
          <SurfaceTitle>
            {state.mode === 'edit' ? 'Editar' : 'Crear'}{' '}
            {kindLabel[kind].toLowerCase()}
          </SurfaceTitle>
          <SurfaceDescription>
            {state.mode === 'edit'
              ? 'Actualiza el nodo dentro del árbol organizacional.'
              : 'Crea un nuevo nivel directamente desde el canvas.'}
          </SurfaceDescription>
        </SurfaceHeader>

        <FieldGroup
          className={isCreateMode ? 'gap-5 px-5 py-4' : undefined}
        >
          {isCreateMode && creatableKinds.length > 1 ? (
            <Field>
              <FieldLabel>Tipo</FieldLabel>
              <FieldContent>
                <Select
                  value={kind}
                  onValueChange={(value) => {
                    setKind(value as Exclude<OrgEntityKind, 'company'>);
                    setValidationError(null);
                  }}
                  disabled={isPending || !canEditCreateFields}
                >
                  <SelectTrigger aria-label="Tipo de nodo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {creatableKinds.map((creatableKind) => (
                      <SelectItem key={creatableKind} value={creatableKind}>
                        {kindLabel[creatableKind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          ) : null}

          <Field>
            <FieldLabel htmlFor="organization-node-name">Nombre</FieldLabel>
            <FieldContent>
              <Input
                id="organization-node-name"
                aria-label="Nombre"
                disabled={isPending || !canEditCreateFields}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setValidationError(null);
                }}
              />
            </FieldContent>
          </Field>

          {kind === 'local' ? (
            <Field>
              <FieldLabel>División</FieldLabel>
              <FieldContent>
                <Select
                  value={divisionId}
                  onValueChange={(value) => {
                    setDivisionId(value);
                    setValidationError(null);
                  }}
                  disabled={isPending || !canEditCreateFields}
                >
                  <SelectTrigger aria-label="División del local">
                    <SelectValue placeholder="Sin división" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT}>Sin división</SelectItem>
                    {divisions.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          ) : null}

          {kind === 'area' ? (
            <>
              <Field>
                <FieldLabel>Tipo de padre</FieldLabel>
                <FieldContent>
                  <Select
                    value={areaParentType}
                    onValueChange={(value) => {
                      const nextType = value as 'division' | 'local';
                      setAreaParentType(nextType);
                      setAreaParentId(
                        nextType === 'division'
                          ? (divisions[0]?.id ?? NO_PARENT)
                          : (locals[0]?.id ?? NO_PARENT),
                      );
                      setValidationError(null);
                    }}
                    disabled={isPending || !canEditCreateFields}
                  >
                    <SelectTrigger aria-label="Tipo de padre del área">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="division">División</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>
                  {areaParentType === 'division' ? 'División' : 'Local'}
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={areaParentId}
                    onValueChange={(value) => {
                      setAreaParentId(value);
                      setValidationError(null);
                    }}
                    disabled={isPending || !canEditCreateFields}
                  >
                    <SelectTrigger aria-label="Padre del área">
                      <SelectValue placeholder="Selecciona un padre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PARENT}>
                        Selecciona un padre
                      </SelectItem>
                      {(areaParentType === 'division' ? divisions : locals).map(
                        (parent) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.name}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            </>
          ) : null}

          {kind === 'warehouse' || kind === 'point-of-sale' ? (
            <>
              <Field>
                <FieldLabel>Tipo de padre</FieldLabel>
                <FieldContent>
                  <Select
                    value={storageParentType}
                    onValueChange={(value) => {
                      const nextType = value as 'area' | 'local';
                      setStorageParentType(nextType);
                      setStorageParentId(
                        nextType === 'area'
                          ? (areas[0]?.id ?? NO_PARENT)
                          : (locals[0]?.id ?? NO_PARENT),
                      );
                      setValidationError(null);
                    }}
                    disabled={isPending || !canEditCreateFields}
                  >
                    <SelectTrigger aria-label="Tipo de padre del nodo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="area">Área</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>
                  {storageParentType === 'area' ? 'Área' : 'Local'}
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={storageParentId}
                    onValueChange={(value) => {
                      setStorageParentId(value);
                      setValidationError(null);
                    }}
                    disabled={isPending || !canEditCreateFields}
                  >
                    <SelectTrigger aria-label="Padre del nodo">
                      <SelectValue placeholder="Selecciona un padre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PARENT}>
                        Selecciona un padre
                      </SelectItem>
                      {(storageParentType === 'area' ? areas : locals).map(
                        (parent) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.name}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            </>
          ) : null}

          {isCreateMode ? (
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Responsable del nodo (opcional)
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Si completás un correo, al crear el nodo también se generará una invitación para su responsable.
                </p>
              </div>

              <Field className="mt-4">
                <FieldLabel htmlFor="organization-node-responsible-email">
                  Correo del responsable
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="organization-node-responsible-email"
                    aria-label="Correo del responsable"
                    type="email"
                    autoComplete="email"
                    disabled={isPending}
                    value={responsibleEmail}
                    onChange={(event) => {
                      setResponsibleEmail(event.target.value);
                      setInvitationError(null);
                    }}
                    placeholder="responsable@empresa.com"
                  />
                </FieldContent>
              </Field>

              {createdInviteTarget && invitationError ? (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  El nodo ya fue creado. Podés corregir el correo y reintentar la invitación sin volver a crear el nodo.
                </p>
              ) : null}

              {invitationResult ? (
                <p className="mt-3 text-xs leading-5 text-emerald-700">
                  Invitación lista para {invitationResult.inviteeEmail}.
                </p>
              ) : null}
            </div>
          ) : null}

          {validationError ? (
            <FieldError errors={[{ message: validationError }]} />
          ) : null}
        </FieldGroup>

        {submissionError || invitationError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {invitationError ?? getEntityErrorMessage(kind, submissionError)}
          </p>
        ) : null}

        <SurfaceFooter
          className={
            isCreateMode ? 'mt-0 p-5 pt-2' : undefined
          }
        >
          <SurfaceClose asChild>
            <Button
              type="button"
              variant="ghost"
              className="cursor-pointer"
              disabled={isPending}
            >
              Cancelar
            </Button>
          </SurfaceClose>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={isPending}
            onClick={() => void handleSubmit()}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {createdInviteTarget ? 'Reintentar invitación' : 'Guardar'}
          </Button>
        </SurfaceFooter>
      </SurfaceContent>
    </Surface>
  );
};

const OrganizationDeleteDialog = ({
  state,
  onOpenChange,
  companyId,
  divisions,
  locals,
  areas,
  warehouses,
  pointsOfSale,
}: {
  state: DeleteDialogState;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  divisions: Division[];
  locals: Local[];
  areas: Area[];
  warehouses: Warehouse[];
  pointsOfSale: PointOfSale[];
}) => {
  const deleteDivision = useDeleteDivision(companyId);
  const deleteLocal = useDeleteLocal(companyId);
  const deleteArea = useDeleteArea(companyId);
  const deleteWarehouse = useDeleteWarehouse(companyId);
  const deletePointOfSale = useDeletePointOfSale(companyId);
  const [error, setError] = useState<string | null>(null);

  const entity =
    (state.kind === 'division' &&
      divisions.find((division) => division.id === state.entityId)) ||
    (state.kind === 'local' &&
      locals.find((local) => local.id === state.entityId)) ||
    (state.kind === 'area' &&
      areas.find((area) => area.id === state.entityId)) ||
    (state.kind === 'warehouse' &&
      warehouses.find((warehouse) => warehouse.id === state.entityId)) ||
    (state.kind === 'point-of-sale' &&
      pointsOfSale.find((pointOfSale) => pointOfSale.id === state.entityId)) ||
    null;

  const isPending =
    deleteDivision.isPending ||
    deleteLocal.isPending ||
    deleteArea.isPending ||
    deleteWarehouse.isPending ||
    deletePointOfSale.isPending;

  const handleConfirm = async () => {
    if (!entity) return;

    try {
      if (state.kind === 'division') {
        await deleteDivision.mutateAsync(entity.id);
      }
      if (state.kind === 'local') {
        await deleteLocal.mutateAsync(entity.id);
      }
      if (state.kind === 'area') {
        await deleteArea.mutateAsync(entity.id);
      }
      if (state.kind === 'warehouse') {
        await deleteWarehouse.mutateAsync(entity.id);
      }
      if (state.kind === 'point-of-sale') {
        await deletePointOfSale.mutateAsync(entity.id);
      }

      onOpenChange(false);
    } catch (submissionError) {
      setError(getDeleteErrorMessage(state.kind, submissionError));
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Eliminar {kindLabel[state.kind].toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            ¿Seguro que deseas eliminar «{entity?.name ?? 'este nodo'}»? Esta
            acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() => void handleConfirm()}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const OrganizationWorkspace = ({ session }: { session: AuthSession }) => {
  const { fitView, getIntersectingNodes } = useReactFlow<
    OrganizationCanvasNode,
    Edge
  >();
  const companyId = session.activeCompany?.companyId;
  const divisionsQuery = useDivisions(companyId);
  const localsQuery = useLocals(companyId);
  const areasQuery = useAreas(companyId);
  const warehousesQuery = useWarehouses(companyId);
  const pointsOfSaleQuery = usePointsOfSale(companyId);
  const responsibilitiesQuery = useNodeManagementResponsibilities(companyId);
  const pendingInvitationsQuery = useNodeManagementPendingInvitations(companyId);
  const [dialogState, setDialogState] =
    useState<OrganizationDialogState | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteDialogState | null>(
    null,
  );
  const [nodes, setNodes] = useState<OrganizationFlowNode[]>([]);
  const [edges, setEdges] = useState<OrganizationCanvasEdge[]>([]);
  const [hasManualArrangement, setHasManualArrangement] = useState(false);
  const [activeDropTargetId, setActiveDropTargetId] = useState<string | null>(
    null,
  );
  const [previewEdge, setPreviewEdge] = useState<OrganizationCanvasEdge | null>(
    null,
  );
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [isToolbarOpen, setIsToolbarOpen] = useState(true);
  const dragStartPositionsRef = useRef<
    Record<string, { x: number; y: number }>
  >({});
  const lastLayoutKeyRef = useRef<string | null>(null);
  const moveLocal = useUpdateLocal(companyId ?? '');
  const moveArea = useUpdateArea(companyId ?? '');
  const moveWarehouse = useUpdateWarehouse(companyId ?? '');
  const movePointOfSale = useUpdatePointOfSale(companyId ?? '');

  const isLoading =
    divisionsQuery.isLoading ||
    localsQuery.isLoading ||
    areasQuery.isLoading ||
    warehousesQuery.isLoading ||
    pointsOfSaleQuery.isLoading ||
    responsibilitiesQuery.isLoading ||
    pendingInvitationsQuery.isLoading;

  const failedQuery =
    (divisionsQuery.isError && divisionsQuery.error) ||
    (localsQuery.isError && localsQuery.error) ||
    (areasQuery.isError && areasQuery.error) ||
    (warehousesQuery.isError && warehousesQuery.error) ||
    (pointsOfSaleQuery.isError && pointsOfSaleQuery.error) ||
    (responsibilitiesQuery.isError && responsibilitiesQuery.error) ||
    (pendingInvitationsQuery.isError && pendingInvitationsQuery.error) ||
    null;

  const divisions = divisionsQuery.data ?? [];
  const locals = localsQuery.data ?? [];
  const areas = areasQuery.data ?? [];
  const warehouses = warehousesQuery.data ?? [];
  const pointsOfSale = pointsOfSaleQuery.data ?? [];
  const responsibilities = responsibilitiesQuery.data ?? [];
  const pendingInvitations = pendingInvitationsQuery.data ?? [];
  const currentCompanyQuery = useDashboardCurrentCompany(
    undefined,
    Boolean(companyId),
  );
  const responsibilitiesByScope = new globalThis.Map<
    string,
    NodeResponsibilitySummary
  >();

  for (const responsibility of responsibilities) {
    if (responsibility.isActive && responsibility.endedAt === null) {
      responsibilitiesByScope.set(
        getScopeKey(responsibility.scopeType, responsibility.scopeId),
        buildNodeResponsibilitySummary({ activeResponsibility: responsibility }),
      );
    }
  }

  for (const invitation of pendingInvitations) {
    const key = getScopeKey(invitation.scopeType, invitation.scopeId);

    if (!responsibilitiesByScope.has(key)) {
      responsibilitiesByScope.set(
        key,
        buildNodeResponsibilitySummary({ pendingInvitation: invitation }),
      );
    }
  }

  const entries = getGraphEntries({
    companyId: companyId!,
    companyName: currentCompanyQuery.data?.name ?? 'Empresa',
    responsibilitiesByScope,
    divisions,
    locals,
    areas,
    warehouses,
    pointsOfSale,
  });
  const metrics = {
    divisions: divisions.length,
    locals: locals.length,
    areas: areas.length,
    warehouses: warehouses.length,
    pointsOfSale: pointsOfSale.length,
  };

  const syncLayout = (preserveManualPositions: boolean) => {
    setIsLayoutReady(false);
    lastLayoutKeyRef.current = null;
    const graph = buildFlowGraph({
      entries,
      onCreateChild: (nodeId, kind) => {
        if (kind === 'company') {
          setDialogState({
            mode: 'create',
            parentKind: 'company',
            parentId: nodeId,
            initialKind: 'division',
          });
          return;
        }

        if (kind === 'division') {
          setDialogState({
            mode: 'create',
            parentKind: 'division',
            parentId: nodeId,
          });
          return;
        }

        if (kind === 'local') {
          setDialogState({
            mode: 'create',
            parentKind: 'local',
            parentId: nodeId,
          });
          return;
        }

        if (kind === 'area') {
          setDialogState({
            mode: 'create',
            parentKind: 'area',
            parentId: nodeId,
          });
        }
      },
      onEdit: (nodeId, kind) => {
        if (kind === 'company') return;
        setDialogState({ mode: 'edit', kind, entityId: nodeId });
      },
      onDelete: (nodeId, kind) => {
        if (kind === 'company') return;
        setDeleteState({ kind, entityId: nodeId });
      },
    });

    setNodes((previousNodes) => {
      const previousPositionMap = new globalThis.Map(
        previousNodes.map((node) => [node.id, node.position]),
      );
      const previousDimensionsMap = new globalThis.Map(
        previousNodes.map((node) => [
          node.id,
          {
            width: node.width,
            height: node.height,
            measured: node.measured,
          },
        ]),
      );

      return graph.nodes.map((node) => {
        const dimensions = previousDimensionsMap.get(node.id);
        const position = preserveManualPositions
          ? (previousPositionMap.get(node.id) ?? node.position)
          : node.position;

        if (!isOrganizationNode(node)) {
          return { ...node, ...dimensions, position };
        }

        return {
          ...node,
          ...dimensions,
          position,
          data: { ...node.data, isDropTarget: activeDropTargetId === node.id },
        };
      });
    });
    setEdges(graph.edges);
  };

  useEffect(() => {
    if (isLoading || failedQuery || !companyId) return;
    syncLayout(hasManualArrangement);
    // syncLayout closes over the current tree and stable React state setters.
    // The query data dependencies above are the intended synchronization boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyId,
    divisionsQuery.data,
    localsQuery.data,
    areasQuery.data,
    warehousesQuery.data,
    pointsOfSaleQuery.data,
    responsibilitiesQuery.data,
    pendingInvitationsQuery.data,
    currentCompanyQuery.data,
  ]);

  const layoutKey = `${layoutRevision}::${nodes
    .map((node) => {
      const width = node.measured?.width ?? node.width ?? 0;
      const height = node.measured?.height ?? node.height ?? 0;
      return `${node.id}:${width}x${height}`;
    })
    .join('|')}::${edges.map((edge) => `${edge.source}>${edge.target}`).join('|')}`;

  useEffect(() => {
    if (
      !nodes.length ||
      lastLayoutKeyRef.current === layoutKey
    ) {
      return;
    }

    lastLayoutKeyRef.current = layoutKey;
    setNodes((currentNodes) => getLayoutedElements(currentNodes, edges));

    let isActive = true;
    const revealLayout = () => {
      if (!isActive) return;
      void fitView({ padding: 0.34, maxZoom: 0.78, duration: 280 });
      setIsLayoutReady(true);
    };
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(revealLayout);
    });
    const fallback = window.setTimeout(revealLayout, LAYOUT_READY_FALLBACK_MS);

    return () => {
      isActive = false;
      cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
    };
  }, [edges, fitView, layoutKey, nodes.length]);

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        isOrganizationNode(node)
          ? {
              ...node,
              data: { ...node.data, isDropTarget: activeDropTargetId === node.id },
            }
          : node,
      ),
    );
  }, [activeDropTargetId]);

  const onNodesChange = (changes: NodeChange<OrganizationFlowNode>[]) => {
    const movedNode = changes.some(
      (change) =>
        change.type === 'position' ||
        (change.type === 'dimensions' &&
          'dragging' in change &&
          change.dragging),
    );

    if (movedNode) {
      setHasManualArrangement(true);
    }

    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  };

  const restoreNodePosition = (nodeId: string) => {
    const startPosition = dragStartPositionsRef.current[nodeId];
    if (!startPosition) return;

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              position: startPosition,
            }
          : node,
      ),
    );
  };

  const handleNodeDragStart = (
    _event: unknown,
    node: OrganizationCanvasNode,
  ) => {
    dragStartPositionsRef.current[node.id] = node.position;
    setActiveDropTargetId(null);
    setPreviewEdge(null);
  };

  const handleNodeDrag = (_event: unknown, node: OrganizationCanvasNode) => {
    const intersectingNodes = getIntersectingNodes(node).filter(
      (candidateNode) => candidateNode.id !== node.id,
    );
    const validTarget = getValidDropTarget({
      draggedNode: node,
      intersectingNodes,
    });

    setActiveDropTargetId(validTarget?.id ?? null);
    setPreviewEdge(
      validTarget
        ? {
            id: `preview-${validTarget.id}-${node.id}`,
            source: validTarget.id,
            target: node.id,
            type: 'smoothstep',
            animated: true,
            className: 'organization-preview-edge',
            markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
            style: {
              stroke: 'rgba(16, 185, 129, 0.9)',
              strokeWidth: 2.5,
              strokeDasharray: '6 6',
            },
          }
        : null,
    );
  };

  const handleNodeDragStop = async (
    _event: unknown,
    node: OrganizationCanvasNode,
  ) => {
    const intersectingNodes = getIntersectingNodes(node).filter(
      (candidateNode) => candidateNode.id !== node.id,
    );
    const validTarget = getValidDropTarget({
      draggedNode: node,
      intersectingNodes,
    });

    setActiveDropTargetId(null);
    setPreviewEdge(null);

    if (!validTarget) {
      setHasManualArrangement(true);
      return;
    }

    const currentEntry = entries.find((entry) => entry.id === node.id);
    const targetParentId = validTarget.id === ROOT_NODE_ID ? ROOT_NODE_ID : validTarget.id;

    if (currentEntry?.parentId === targetParentId) {
      setHasManualArrangement(true);
      return;
    }

    const movement = getMovementPayload({
      draggedNode: node,
      targetNode: validTarget,
    });

    if (!movement) {
      restoreNodePosition(node.id);
      const message = 'Ese nodo no se puede reubicar de esa manera.';
      sileo.warning({
        description: message,
        position: 'bottom-right',
        duration: 1800,
      });
      return;
    }

    try {
      if (movement.kind === 'local') {
        await moveLocal.mutateAsync(movement.payload);
      }

      if (movement.kind === 'area') {
        await moveArea.mutateAsync(movement.payload);
      }

      if (movement.kind === 'warehouse') {
        await moveWarehouse.mutateAsync(movement.payload);
      }

      if (movement.kind === 'point-of-sale') {
        await movePointOfSale.mutateAsync(movement.payload);
      }

      setHasManualArrangement(false);
      const message = `${kindLabel[node.data.kind]} movido bajo ${kindLabel[validTarget.data.kind].toLowerCase()} «${validTarget.data.label}».`;
      sileo.success({
        description: message,
        position: 'bottom-right',
        duration: 1600,
      });
    } catch (error) {
      restoreNodePosition(node.id);
      const message =
        error instanceof Error ? error.message : 'No se pudo mover el nodo seleccionado.';
      sileo.error({
        description: message,
        position: 'bottom-right',
        duration: 2200,
      });
    }
  };

  if (!companyId) {
    return (
      <div className="flex h-full min-h-[calc(100dvh-8.5rem)] items-center justify-center rounded-[32px] border border-border/70 bg-background/85 p-8 text-center shadow-[0_24px_80px_-56px_rgba(0,0,0,0.45)]">
        <div className="max-w-md space-y-3">
          <p className="text-3xl font-semibold tracking-tight">Organización</p>
          <p className="text-sm leading-6 text-muted-foreground">
            Seleccioná una empresa activa para construir su árbol organizacional
            en este canvas.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[calc(100dvh-8.5rem)] flex-col gap-4 rounded-[32px] border border-border/70 bg-background/85 p-6 shadow-[0_24px_80px_-56px_rgba(0,0,0,0.45)]">
        <Skeleton className="h-10 w-72 rounded-full" />
        <Skeleton className="h-5 w-96 rounded-full" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28 rounded-[28px]" />
          <Skeleton className="h-28 rounded-[28px]" />
          <Skeleton className="h-28 rounded-[28px]" />
          <Skeleton className="h-28 rounded-[28px]" />
        </div>
        <Skeleton className="h-full min-h-[560px] rounded-[32px]" />
      </div>
    );
  }

  if (failedQuery) {
    return (
      <div className="flex h-full min-h-[calc(100dvh-8.5rem)] items-center justify-center rounded-[32px] border border-destructive/25 bg-destructive/5 p-8 text-center shadow-[0_24px_80px_-56px_rgba(0,0,0,0.45)]">
        <div className="max-w-xl space-y-3">
          <p className="text-2xl font-semibold tracking-tight text-destructive">
            No se pudo cargar la organización
          </p>
          <p className="text-sm leading-6 text-destructive/80">
            {failedQuery instanceof Error
              ? failedQuery.message
              : 'Hubo un problema al leer la estructura organizacional.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100dvh-8.5rem)] flex-col overflow-hidden rounded-[36px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,248,246,0.96))] shadow-[0_34px_120px_-70px_rgba(0,0,0,0.5)]">
      <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle,#d4d4d4_1px,transparent_1px)] bg-[length:18px_18px]">
        <ReactFlow<OrganizationFlowNode, OrganizationCanvasEdge>
          nodes={nodes}
          edges={previewEdge ? [...edges, previewEdge] : edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStart={(event, node) =>
            handleNodeDragStart(event, node as OrganizationCanvasNode)
          }
          onNodeDrag={(event, node) =>
            handleNodeDrag(event, node as OrganizationCanvasNode)
          }
          onNodeDragStop={(event, node) => {
            void handleNodeDragStop(event, node as OrganizationCanvasNode);
          }}
          panOnDrag
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          minZoom={0.18}
        >
          <Background gap={18} size={1} color="rgba(115,115,115,0.2)" />
          <Controls showInteractive={false} />

          {!isLayoutReady ? (
            <div className="absolute inset-0 z-30 flex h-dvh w-full items-center justify-center bg-background/90 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-16 items-center justify-center rounded-3xl bg-zinc-950 text-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.55)]">
                  <Building2 className="size-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Cargando organización
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Preparando el organigrama...
                  </p>
                </div>
                <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-zinc-950" />
                </div>
              </div>
            </div>
          ) : null}

          <Panel position="top-left" className="m-0">
            <div className="px-3 pt-3">
              <div className="relative h-11 w-[760px] max-w-[calc(100vw-2rem)]">
                <div
                  className={`absolute left-0 top-0 flex h-11 origin-left items-center gap-2 overflow-hidden rounded-full px-2 py-2 backdrop-blur transition-[width,background-color,border-color,box-shadow] duration-300 ease-out ${
                    isToolbarOpen
                      ? 'w-max border border-border/70 bg-background/90 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.45)]'
                      : 'w-11 border border-transparent bg-transparent shadow-none'
                  }`}
                >
                  <Button
                    type="button"
                    size="icon"
                    className="shrink-0 rounded-full bg-zinc-950 text-white shadow-sm transition-transform duration-200 hover:scale-[1.03]"
                    onClick={() => setIsToolbarOpen((current) => !current)}
                    aria-label={isToolbarOpen ? 'Cerrar barra' : 'Abrir barra'}
                  >
                    {isToolbarOpen ? (
                      <ChevronLeft className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </Button>

                    <div
                      className={`flex items-center gap-2 transition-[opacity,transform] duration-300 ${
                      isToolbarOpen
                        ? 'translate-x-0 opacity-100'
                        : 'pointer-events-none -translate-x-3 opacity-0'
                    }`}
                  >
                    {[
                      {
                        label: 'Divisiones',
                        value: metrics.divisions,
                        icon: Network,
                        helper:
                          'Agrupan estructura superior y ayudan a ordenar locales y áreas por línea operativa.',
                      },
                      {
                        label: 'Locales',
                        value: metrics.locals,
                        icon: Store,
                        helper:
                          'Representan sedes físicas o sucursales. Pueden vivir directo bajo empresa o dentro de una división.',
                      },
                      {
                        label: 'Áreas',
                        value: metrics.areas,
                        icon: Map,
                        helper:
                          'Son zonas operativas para separar inventario, atención o trabajo interno dentro de la estructura.',
                      },
                      {
                        label: 'Almacenes',
                        value: metrics.warehouses,
                        icon: Box,
                        helper:
                          'Definen dónde vive el stock. Se pueden colgar de un local o de un área específica.',
                      },
                      {
                        label: 'Puntos de venta',
                        value: metrics.pointsOfSale,
                        icon: ShoppingBasket,
                        helper:
                          'Marcan dónde se concreta la venta. Sirven para separar operación comercial del resto del árbol.',
                      },
                    ].map((item) => (
                      <HoverCard key={item.label} openDelay={120} closeDelay={80}>
                        <HoverCardTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-2 rounded-full px-1 py-0.5 text-left transition hover:bg-background/70"
                          >
                            <span className="flex size-7 items-center justify-center rounded-full border border-border/70 bg-background/95 text-muted-foreground shadow-sm">
                              <item.icon className="size-3.5" />
                            </span>
                            <span className="text-xl font-semibold leading-none text-foreground">
                              {item.value}
                            </span>
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-60 rounded-2xl border-border/70 bg-background/96 p-3 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.45)]">
                          <div className="flex items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-foreground">
                              <item.icon className="size-4" />
                            </span>
                            <div className="space-y-1.5">
                              <p className="text-sm font-semibold text-foreground">
                                {item.label}
                              </p>
                              <p className="text-xs leading-5 text-muted-foreground">
                                {item.helper}
                              </p>
                              <p className="text-xs font-medium text-foreground/80">
                                Total actual: {item.value}
                              </p>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ))}

                    <div className="h-6 w-px bg-border/70" />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => {
                        setHasManualArrangement(false);
                        syncLayout(false);
                        setLayoutRevision((revision) => revision + 1);
                      }}
                      aria-label="Autoestructurar árbol"
                    >
                      <PencilSparkles className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {dialogState ? (
        <OrganizationEntityDialog
          key={JSON.stringify(dialogState)}
          state={dialogState}
          onOpenChange={(open) => {
            if (!open) {
              setDialogState(null);
            }
          }}
          companyId={companyId}
          divisions={divisions}
          locals={locals}
          areas={areas}
          warehouses={warehouses}
          pointsOfSale={pointsOfSale}
        />
      ) : null}

      {deleteState ? (
        <OrganizationDeleteDialog
          key={`${deleteState.kind}-${deleteState.entityId}`}
          state={deleteState}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteState(null);
            }
          }}
          companyId={companyId}
          divisions={divisions}
          locals={locals}
          areas={areas}
          warehouses={warehouses}
          pointsOfSale={pointsOfSale}
        />
      ) : null}
    </div>
  );
};

export const OrganizationPage = ({ session }: { session: AuthSession }) => {
  return (
    <ReactFlowProvider>
      <OrganizationWorkspace session={session} />
    </ReactFlowProvider>
  );
};
