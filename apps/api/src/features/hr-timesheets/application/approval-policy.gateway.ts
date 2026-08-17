export type ApprovalPolicyGateway = {
  findActivePolicyForScope: (
    companyId: string,
    scopeNodeId: string,
  ) => Promise<{ id: string } | null>;
};
