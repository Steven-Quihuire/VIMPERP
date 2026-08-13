export type Division = {
  id: string;
  companyId: string;
  name: string;
  createdAt: Date;
};

export type Local = {
  id: string;
  companyId: string;
  divisionId: string | null;
  name: string;
  locale: string | null;
};

export type AreaParent =
  | { divisionId: string; localId?: never }
  | { divisionId?: never; localId: string };

export type AreaParentUpdate =
  | { divisionId: string; localId?: never }
  | { divisionId?: never; localId: string };

export type Area = {
  id: string;
  companyId: string;
  divisionId: string | null;
  localId: string | null;
  name: string;
  kind: 'area';
  createdAt: Date;
};

export type WarehouseParent =
  { areaId: string; localId?: never } | { areaId?: never; localId: string };

export type WarehouseParentUpdate =
  { areaId: string; localId?: never } | { areaId?: never; localId: string };

export type Warehouse = {
  id: string;
  companyId: string;
  areaId: string | null;
  localId: string | null;
  name: string;
  createdAt: Date;
};

export type PointOfSale = {
  id: string;
  companyId: string;
  areaId: string | null;
  localId: string | null;
  name: string;
  createdAt: Date;
};

export type DivisionDraft = { name: string };
export type LocalDraft = { name: string; divisionId?: string | null };
export type AreaDraft = { name: string } & AreaParent;
export type WarehouseDraft = { name: string } & WarehouseParent;
export type PointOfSaleDraft = { name: string } & WarehouseParent;

export type OrgHierarchyAuditContext = {
  actorUserId: string;
  correlationId: string;
};

export const orgHierarchyAuditEventTypes = {
  divisionCreated: 'org_hierarchy.division.created',
  divisionUpdated: 'org_hierarchy.division.updated',
  divisionDeleted: 'org_hierarchy.division.deleted',
  localCreated: 'org_hierarchy.local.created',
  localUpdated: 'org_hierarchy.local.updated',
  localDeleted: 'org_hierarchy.local.deleted',
  areaCreated: 'org_hierarchy.area.created',
  areaUpdated: 'org_hierarchy.area.updated',
  areaDeleted: 'org_hierarchy.area.deleted',
  warehouseCreated: 'org_hierarchy.warehouse.created',
  warehouseUpdated: 'org_hierarchy.warehouse.updated',
  warehouseDeleted: 'org_hierarchy.warehouse.deleted',
  pointOfSaleCreated: 'org_hierarchy.point_of_sale.created',
  pointOfSaleUpdated: 'org_hierarchy.point_of_sale.updated',
  pointOfSaleDeleted: 'org_hierarchy.point_of_sale.deleted',
} as const;

export type OrgHierarchyGateway = {
  getScopeNodeDependencyCounts: (input: {
    nodeType: 'division' | 'local' | 'area' | 'warehouse' | 'point-of-sale';
    sourceId: string;
  }) => Promise<ScopeNodeDependencyCounts>;
  createDivision: (
    input: {
      companyId: string;
      name: string;
    } & OrgHierarchyAuditContext,
  ) => Promise<Division>;
  listDivisions: (companyId: string) => Promise<Division[]>;
  updateDivision: (
    input: {
      divisionId: string;
      name: string;
    } & OrgHierarchyAuditContext,
  ) => Promise<Division>;
  deleteDivision: (
    input: {
      divisionId: string;
    } & OrgHierarchyAuditContext,
  ) => Promise<void>;
  countLocalsInDivision: (divisionId: string) => Promise<number>;

  createLocal: (
    input: {
      companyId: string;
      name: string;
      divisionId?: string | null;
    } & OrgHierarchyAuditContext,
  ) => Promise<Local>;
  listLocals: (companyId: string) => Promise<Local[]>;
  updateLocal: (
    input: {
      localId: string;
      name?: string;
      divisionId?: string | null;
    } & OrgHierarchyAuditContext,
  ) => Promise<Local>;
  deleteLocal: (
    input: { localId: string } & OrgHierarchyAuditContext,
  ) => Promise<void>;
  countItemsInLocal: (localId: string) => Promise<number>;
  countMembershipsInLocal: (localId: string) => Promise<number>;
  countAreasInDivision: (divisionId: string) => Promise<number>;
  countAreasInLocal: (localId: string) => Promise<number>;
  countWarehousesInLocal: (localId: string) => Promise<number>;
  countPointsOfSaleInLocal: (localId: string) => Promise<number>;
  findLocalById: (localId: string) => Promise<Local | null>;

  findDivisionById: (divisionId: string) => Promise<Division | null>;

  createArea: (
    input: { companyId: string; name: string } & AreaParent &
      OrgHierarchyAuditContext,
  ) => Promise<Area>;
  listAreas: (companyId: string) => Promise<Area[]>;
  updateArea: (
    input:
      | ({ areaId: string; name: string } & OrgHierarchyAuditContext)
      | (({ areaId: string; name?: string | undefined } & AreaParentUpdate) &
          OrgHierarchyAuditContext),
  ) => Promise<Area>;
  deleteArea: (
    input: { areaId: string } & OrgHierarchyAuditContext,
  ) => Promise<void>;
  countWarehousesInArea: (areaId: string) => Promise<number>;
  countPointsOfSaleInArea: (areaId: string) => Promise<number>;
  countEmployeesInArea: (areaId: string) => Promise<number>;

  createWarehouse: (
    input: { companyId: string; name: string } & WarehouseParent &
      OrgHierarchyAuditContext,
  ) => Promise<Warehouse>;
  listWarehouses: (companyId: string) => Promise<Warehouse[]>;
  updateWarehouse: (
    input:
      | ({ warehouseId: string; name: string } & OrgHierarchyAuditContext)
      | (({
          warehouseId: string;
          name?: string | undefined;
        } & WarehouseParentUpdate) &
          OrgHierarchyAuditContext),
  ) => Promise<Warehouse>;
  deleteWarehouse: (
    input: { warehouseId: string } & OrgHierarchyAuditContext,
  ) => Promise<void>;

  createPointOfSale: (
    input: { companyId: string; name: string } & WarehouseParent &
      OrgHierarchyAuditContext,
  ) => Promise<PointOfSale>;
  listPointsOfSale: (companyId: string) => Promise<PointOfSale[]>;
  updatePointOfSale: (
    input:
      | ({ pointOfSaleId: string; name: string } & OrgHierarchyAuditContext)
      | (({
          pointOfSaleId: string;
          name?: string | undefined;
        } & WarehouseParentUpdate) &
          OrgHierarchyAuditContext),
  ) => Promise<PointOfSale>;
  deletePointOfSale: (
    input: {
      pointOfSaleId: string;
    } & OrgHierarchyAuditContext,
  ) => Promise<void>;
  findAreaById: (areaId: string) => Promise<Area | null>;
  findWarehouseById: (warehouseId: string) => Promise<Warehouse | null>;
  findPointOfSaleById: (pointOfSaleId: string) => Promise<PointOfSale | null>;
};

export type ScopeNodeDependencyCounts = {
  roleAssignments: number;
  responsibilities: number;
  managementInvitations: number;
  activeScopePreferences: number;
};

export const hasScopeNodeDependencies = (counts: ScopeNodeDependencyCounts) =>
  counts.roleAssignments > 0 ||
  counts.responsibilities > 0 ||
  counts.managementInvitations > 0;

export class ParentOwnershipError extends Error {
  readonly code = 'PARENT_OWNERSHIP_CONFLICT';

  constructor(message = 'Parent node does not belong to the same company.') {
    super(message);
    this.name = 'ParentOwnershipError';
  }
}

export class InvalidHierarchyParentError extends Error {
  readonly code = 'INVALID_HIERARCHY_PARENT';

  constructor(message = 'Exactly one parent is required.') {
    super(message);
    this.name = 'InvalidHierarchyParentError';
  }
}

export class DivisionConflictError extends Error {
  readonly code = 'DIVISION_CONFLICT';

  constructor(
    message = 'Cannot delete division with existing locals or areas.',
  ) {
    super(message);
    this.name = 'DivisionConflictError';
  }
}

export class LocalConflictError extends Error {
  readonly code = 'LOCAL_CONFLICT';

  constructor(
    message = 'Cannot delete local with existing items, members, areas, warehouses, or points of sale.',
  ) {
    super(message);
    this.name = 'LocalConflictError';
  }
}

export class AreaConflictError extends Error {
  readonly code = 'AREA_CONFLICT';

  constructor(
    message = 'Cannot delete area with existing warehouses, points of sale, or employees.',
  ) {
    super(message);
    this.name = 'AreaConflictError';
  }
}

export class WarehouseConflictError extends Error {
  readonly code = 'WAREHOUSE_CONFLICT';

  constructor(message = 'Cannot delete warehouse with dependent records.') {
    super(message);
    this.name = 'WarehouseConflictError';
  }
}

export class PointOfSaleConflictError extends Error {
  readonly code = 'POINT_OF_SALE_CONFLICT';

  constructor(message = 'Cannot delete point of sale with dependent records.') {
    super(message);
    this.name = 'PointOfSaleConflictError';
  }
}

export class DivisionNameConflictError extends Error {
  readonly code = 'DIVISION_NAME_CONFLICT';

  constructor(message = 'A division with this name already exists.') {
    super(message);
    this.name = 'DivisionNameConflictError';
  }
}

export class LocalNameConflictError extends Error {
  readonly code = 'LOCAL_NAME_CONFLICT';

  constructor(message = 'A local with this name already exists.') {
    super(message);
    this.name = 'LocalNameConflictError';
  }
}

export class AreaNameConflictError extends Error {
  readonly code = 'AREA_NAME_CONFLICT';

  constructor(message = 'An area with this name already exists.') {
    super(message);
    this.name = 'AreaNameConflictError';
  }
}

export class WarehouseNameConflictError extends Error {
  readonly code = 'WAREHOUSE_NAME_CONFLICT';

  constructor(message = 'A warehouse with this name already exists.') {
    super(message);
    this.name = 'WarehouseNameConflictError';
  }
}

export class PointOfSaleNameConflictError extends Error {
  readonly code = 'POINT_OF_SALE_NAME_CONFLICT';

  constructor(message = 'A point of sale with this name already exists.') {
    super(message);
    this.name = 'PointOfSaleNameConflictError';
  }
}

export class DivisionNotFoundError extends Error {
  readonly code = 'DIVISION_NOT_FOUND';

  constructor(message = 'Division not found') {
    super(message);
    this.name = 'DivisionNotFoundError';
  }
}

export class LocalNotFoundError extends Error {
  readonly code = 'LOCAL_NOT_FOUND';

  constructor(message = 'Local not found') {
    super(message);
    this.name = 'LocalNotFoundError';
  }
}

export class AreaNotFoundError extends Error {
  readonly code = 'AREA_NOT_FOUND';

  constructor(message = 'Area not found') {
    super(message);
    this.name = 'AreaNotFoundError';
  }
}

export class WarehouseNotFoundError extends Error {
  readonly code = 'WAREHOUSE_NOT_FOUND';

  constructor(message = 'Warehouse not found') {
    super(message);
    this.name = 'WarehouseNotFoundError';
  }
}

export class PointOfSaleNotFoundError extends Error {
  readonly code = 'POINT_OF_SALE_NOT_FOUND';

  constructor(message = 'Point of sale not found') {
    super(message);
    this.name = 'PointOfSaleNotFoundError';
  }
}
