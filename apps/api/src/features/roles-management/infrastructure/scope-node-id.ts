import type { ScopeRef, ScopeType } from '../domain/assignments';

type ScopeNodeKeyInput = {
  companyId: string;
  scopeType: ScopeType;
  scopeId: string;
};

export const toScopeNodeId = ({ companyId, scopeType, scopeId }: ScopeNodeKeyInput) => {
  if (!scopeId) {
    throw new Error(`scopeId is required for ${scopeType}`);
  }

  if (scopeType === 'company' && scopeId !== companyId) {
    throw new Error(`company scopeId must match companyId (${companyId})`);
  }

  return scopeType === 'company' ? `company:${scopeId}` : `${scopeType}:${scopeId}`;
};

export const scopeRefToScopeNodeId = (companyId: string, scope: ScopeRef) =>
  toScopeNodeId({
    companyId,
    scopeType: scope.scopeType,
    scopeId: scope.scopeId,
  });
