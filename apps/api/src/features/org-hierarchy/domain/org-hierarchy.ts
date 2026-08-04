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

export type DivisionDraft = { name: string };
export type LocalDraft = { name: string; divisionId?: string | null };

export type OrgHierarchyGateway = {
  createDivision: (input: { companyId: string; name: string }) =>
    Promise<Division>;
  listDivisions: (companyId: string) => Promise<Division[]>;
  updateDivision: (input: { divisionId: string; name: string }) =>
    Promise<Division>;
  deleteDivision: (divisionId: string) => Promise<void>;
  countLocalsInDivision: (divisionId: string) => Promise<number>;

  createLocal: (input: {
    companyId: string;
    name: string;
    divisionId?: string | null;
  }) => Promise<Local>;
  listLocals: (companyId: string) => Promise<Local[]>;
  updateLocal: (input: {
    localId: string;
    name?: string;
    divisionId?: string | null;
  }) => Promise<Local>;
  deleteLocal: (localId: string) => Promise<void>;
  countItemsInLocal: (localId: string) => Promise<number>;
  countMembershipsInLocal: (localId: string) => Promise<number>;
  findLocalById: (localId: string) => Promise<Local | null>;
};

export class DivisionConflictError extends Error {
  readonly code = 'DIVISION_CONFLICT';

  constructor(message = 'Cannot delete division with existing locals.') {
    super(message);
    this.name = 'DivisionConflictError';
  }
}

export class LocalConflictError extends Error {
  readonly code = 'LOCAL_CONFLICT';

  constructor(message = 'Cannot delete local with existing items or members.') {
    super(message);
    this.name = 'LocalConflictError';
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