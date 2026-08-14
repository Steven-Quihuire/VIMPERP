export type OrgTreeScopeType =
  | 'company'
  | 'division'
  | 'local'
  | 'area'
  | 'warehouse'
  | 'point-of-sale';

export type OrgTreeScopeRef = {
  scopeType: OrgTreeScopeType;
  scopeId: string;
};

export type OrgTreeNode = {
  ref: OrgTreeScopeRef;
  parentRef: OrgTreeScopeRef | null;
  companyId: string;
  name: string;
  employeeCount?: number;
};

export type OrgTreeGateway = {
  listOrgTree: (companyId: string) => Promise<OrgTreeNode[]>;
};
