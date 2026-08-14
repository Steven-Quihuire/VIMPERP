import type { AuthSession } from '@/features/auth/domain/auth';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

import { useApprovalPolicies } from '../../application/approval-policy-queries';
import {
  getApprovalPolicyScopeLabel,
  sortApprovalPoliciesByUpdatedAtDesc,
} from '../../domain/approval-policy';

export const PoliciesListPage = ({
  session,
  apiBaseUrl,
  selectedPolicyId,
  onSelectPolicy,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
  selectedPolicyId?: string | null;
  onSelectPolicy?: (policyId: string) => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const { policiesQuery, deactivatePolicyMutation } = useApprovalPolicies(companyId, apiBaseUrl);

  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground">
        Seleccioná una compañía activa para consultar las políticas de aprobación.
      </p>
    );
  }

  if (policiesQuery.isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (policiesQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {policiesQuery.error instanceof Error
          ? policiesQuery.error.message
          : 'No se pudieron cargar las políticas de aprobación.'}
      </p>
    );
  }

  const policies = sortApprovalPoliciesByUpdatedAtDesc(policiesQuery.data ?? []);

  if (policies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no se crearon políticas de aprobación.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Política</TableHead>
              <TableHead>Alcance</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((policy) => (
              <TableRow
                key={policy.id}
                data-state={selectedPolicyId === policy.id ? 'selected' : undefined}
              >
                <TableCell>
                  <div className="font-medium">{policy.name}</div>
                  <div className="text-xs text-muted-foreground">{policy.id}</div>
                </TableCell>
                <TableCell>{getApprovalPolicyScopeLabel(policy)}</TableCell>
                <TableCell>
                  <Badge variant={policy.isActive ? 'secondary' : 'outline'}>
                    {policy.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                       aria-label={`Abrir política ${policy.id}`}
                      onClick={() => onSelectPolicy?.(policy.id)}
                    >
                      Abrir
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                       aria-label={`Desactivar política ${policy.id}`}
                      disabled={deactivatePolicyMutation.isPending || !policy.isActive}
                      onClick={() => {
                        void deactivatePolicyMutation.mutateAsync({
                          companyId,
                          policyId: policy.id,
                        });
                      }}
                    >
                      Desactivar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {deactivatePolicyMutation.error ? (
        <p role="alert" className="text-sm text-destructive">
          {deactivatePolicyMutation.error instanceof Error
            ? deactivatePolicyMutation.error.message
             : 'No se pudo desactivar la política de aprobación.'}
        </p>
      ) : null}
    </div>
  );
};
