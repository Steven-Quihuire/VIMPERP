import { scopeTypeValues, type ScopeRef, type ScopeType } from '../domain/assignments';

export const createCurrentContext = (input: {
  scopeType: ScopeType;
  scopeId: string;
}): ScopeRef => {
  if (!scopeTypeValues.includes(input.scopeType)) {
    throw new Error(`Unsupported scope type: ${input.scopeType}`);
  }

  if (!input.scopeId) {
    throw new Error(`scopeId is required for ${input.scopeType}`);
  }

  return {
    scopeType: input.scopeType,
    scopeId: input.scopeId,
  };
};

export const scopeRefToKey = (scope: ScopeRef) => `${scope.scopeType}:${scope.scopeId}`;
