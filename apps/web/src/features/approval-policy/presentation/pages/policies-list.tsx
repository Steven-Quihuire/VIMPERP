import type { AuthSession } from '@/features/auth/domain/auth';
import {
  ChevronLeft,
  ChevronsLeft,
  Users,
} from 'lucide-react';
import { useState } from 'react';

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
import {
  defaultPageSizeOptions,
  TablePageSize,
} from '@/shared/ui/table-page-size';

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

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

  const allPolicies = sortApprovalPoliciesByUpdatedAtDesc(policiesQuery.data ?? []);
  const totalPolicies = allPolicies.length;
  const totalPages = Math.max(1, Math.ceil(totalPolicies / pageSize));
  const policies = allPolicies.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border">
        {totalPolicies === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users className="mx-auto size-8 text-muted-foreground/50" />
            <h3 className="text-xl font-medium tracking-tight">
              Todavía no se crearon políticas de aprobación
            </h3>
            <p className="mt-1 text-xs text-gray-600">
              Definí la primera política usando el formulario de la derecha.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[#f6f6f6] rounded-2xl">
              <TableRow>
                <TableHead className="h-11 pl-5 text-xs">Política</TableHead>
                <TableHead className="h-11 text-xs">Alcance</TableHead>
                <TableHead className="h-11 text-xs">Estado</TableHead>
                <TableHead className="h-11 pr-5 text-right text-xs">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow
                  key={policy.id}
                  data-state={selectedPolicyId === policy.id ? 'selected' : undefined}
                >
                  <TableCell className="py-4 pl-5">
                    <div className="font-medium">{policy.name}</div>
                    <div className="text-xs text-muted-foreground">{policy.id}</div>
                  </TableCell>
                  <TableCell>{getApprovalPolicyScopeLabel(policy)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        policy.isActive
                          ? 'rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'rounded-2xl border-gray-200 bg-gray-50 text-gray-600'
                      }
                    >
                      {policy.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
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
        )}
      </div>

      {totalPolicies > 0 ? (
        <footer className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-t bg-muted/10 px-4 py-3 text-xs sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Mostrando{' '}
              <strong className="font-semibold text-foreground">
                {policies.length}
              </strong>{' '}
              políticas de{' '}
              <strong className="font-semibold text-foreground">
                {totalPolicies}
              </strong>
            </span>
            <span aria-hidden className="h-4 w-px bg-border" />
            <span>Filas por página</span>
            <TablePageSize
              value={pageSize}
              options={defaultPageSizeOptions}
              onChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
            />
          </div>
          <nav
            aria-label="Paginación de políticas"
            className="flex items-center gap-1"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Ir a la primera página"
              disabled={page === 1}
              onClick={() => setPage(1)}
              className="size-8 rounded-md"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Volver al inicio"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="size-8 rounded-md"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="mx-1 h-5 w-px bg-border" />
            {page < totalPages ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                Siguiente
              </Button>
            ) : (
              <span className="px-2 text-muted-foreground/60">
                Última página
              </span>
            )}
          </nav>
        </footer>
      ) : null}

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
