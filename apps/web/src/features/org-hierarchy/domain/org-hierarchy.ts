export type Division = {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
};

export type Local = {
  id: string;
  companyId: string;
  divisionId: string | null;
  name: string;
  locale: string | null;
};

type AreaBase = {
  id: string;
  companyId: string;
  name: string;
  kind: 'area';
  createdAt: string;
};

export type Area =
  | (AreaBase & { divisionId: string; localId: null })
  | (AreaBase & { divisionId: null; localId: string });

type WarehouseBase = {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
};

export type Warehouse =
  | (WarehouseBase & { areaId: string; localId: null })
  | (WarehouseBase & { areaId: null; localId: string });

type PointOfSaleBase = {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
};

export type PointOfSale =
  | (PointOfSaleBase & { areaId: string; localId: null })
  | (PointOfSaleBase & { areaId: null; localId: string });

export type DivisionDraft = { name: string };

export type LocalDraft = { name: string; divisionId?: string | null };
export type AreaDraft =
  | { name: string; divisionId: string; localId?: never }
  | { name: string; divisionId?: never; localId: string };
export type WarehouseDraft =
  | { name: string; areaId: string; localId?: never }
  | { name: string; areaId?: never; localId: string };
export type PointOfSaleDraft =
  | { name: string; areaId: string; localId?: never }
  | { name: string; areaId?: never; localId: string };

export type CreateDivisionInput = { companyId: string; name: string };

export type UpdateDivisionInput = { divisionId: string; name: string };

export type DeleteDivisionInput = { divisionId: string };

export type CreateLocalInput = {
  companyId: string;
  name: string;
  divisionId?: string | null;
};

export type UpdateLocalInput = {
  localId: string;
  name?: string;
  divisionId?: string | null;
};

export type DeleteLocalInput = { localId: string };

export type CreateAreaInput =
  | { companyId: string; name: string; divisionId: string; localId?: never }
  | { companyId: string; name: string; divisionId?: never; localId: string };

export type UpdateAreaInput =
  | { areaId: string; name?: string; divisionId: string; localId?: never }
  | { areaId: string; name?: string; divisionId?: never; localId: string }
  | { areaId: string; name: string };

export type DeleteAreaInput = { areaId: string };

export type CreateWarehouseInput =
  | { companyId: string; name: string; areaId: string; localId?: never }
  | { companyId: string; name: string; areaId?: never; localId: string };

export type UpdateWarehouseInput =
  | { warehouseId: string; name?: string; areaId: string; localId?: never }
  | { warehouseId: string; name?: string; areaId?: never; localId: string }
  | { warehouseId: string; name: string };

export type DeleteWarehouseInput = { warehouseId: string };

export type CreatePointOfSaleInput =
  | { companyId: string; name: string; areaId: string; localId?: never }
  | { companyId: string; name: string; areaId?: never; localId: string };

export type UpdatePointOfSaleInput =
  | { pointOfSaleId: string; name?: string; areaId: string; localId?: never }
  | { pointOfSaleId: string; name?: string; areaId?: never; localId: string }
  | { pointOfSaleId: string; name: string };

export type DeletePointOfSaleInput = { pointOfSaleId: string };

export type OrgHierarchyApi = {
  listDivisions: (companyId: string) => Promise<Division[]>;
  createDivision: (input: CreateDivisionInput) => Promise<Division>;
  updateDivision: (input: UpdateDivisionInput) => Promise<Division>;
  deleteDivision: (divisionId: string) => Promise<void>;
  listLocals: (companyId: string) => Promise<Local[]>;
  createLocal: (input: CreateLocalInput) => Promise<Local>;
  updateLocal: (input: UpdateLocalInput) => Promise<Local>;
  deleteLocal: (localId: string) => Promise<void>;
  listAreas: (companyId: string) => Promise<Area[]>;
  createArea: (input: CreateAreaInput) => Promise<Area>;
  updateArea: (input: UpdateAreaInput) => Promise<Area>;
  deleteArea: (areaId: string) => Promise<void>;
  listWarehouses: (companyId: string) => Promise<Warehouse[]>;
  createWarehouse: (input: CreateWarehouseInput) => Promise<Warehouse>;
  updateWarehouse: (input: UpdateWarehouseInput) => Promise<Warehouse>;
  deleteWarehouse: (warehouseId: string) => Promise<void>;
  listPointsOfSale: (companyId: string) => Promise<PointOfSale[]>;
  createPointOfSale: (input: CreatePointOfSaleInput) => Promise<PointOfSale>;
  updatePointOfSale: (input: UpdatePointOfSaleInput) => Promise<PointOfSale>;
  deletePointOfSale: (pointOfSaleId: string) => Promise<void>;
};
