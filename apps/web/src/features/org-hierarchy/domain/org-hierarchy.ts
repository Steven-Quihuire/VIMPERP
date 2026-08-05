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

export type DivisionDraft = { name: string };

export type LocalDraft = { name: string; divisionId?: string | null };

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

export type OrgHierarchyApi = {
  listDivisions: (companyId: string) => Promise<Division[]>;
  createDivision: (input: CreateDivisionInput) => Promise<Division>;
  updateDivision: (input: UpdateDivisionInput) => Promise<Division>;
  deleteDivision: (divisionId: string) => Promise<void>;
  listLocals: (companyId: string) => Promise<Local[]>;
  createLocal: (input: CreateLocalInput) => Promise<Local>;
  updateLocal: (input: UpdateLocalInput) => Promise<Local>;
  deleteLocal: (localId: string) => Promise<void>;
};
