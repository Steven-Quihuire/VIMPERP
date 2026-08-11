import type { ScopeRef } from '../domain/assignments';
import { scopeRefToKey } from './current-context';

export const scopeLineageContains = (lineage: ScopeRef[], scope: ScopeRef) => {
  const requestedScope = scopeRefToKey(scope);
  return lineage.some((entry) => scopeRefToKey(entry) === requestedScope);
};
