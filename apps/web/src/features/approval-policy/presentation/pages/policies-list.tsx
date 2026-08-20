import type { AuthSession } from '@/features/auth/domain/auth';
import {
  ChevronLeft,
  ChevronsLeft,
  CircleAlert,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ApprovalPolicy } from '../../domain/approval-policy';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
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
import { HoverExpandFab } from '@/shared/ui/hover-expand-fab';

import { useApprovalPoliciesPage } from '../../application/approval-policy-queries';
import {
  getApprovalPolicyScopeLabel,
  sortApprovalPoliciesByUpdatedAtDesc,
} from '../../domain/approval-policy';
import {
  ApprovalPolicyFilters,
  type ApprovalPolicyFiltersValue,
} from '../components/approval-policy-filters';
import { PolicyFormPage } from './policy-form';

const emptyApprovalPolicyFilters: ApprovalPolicyFiltersValue = {
  status: new Set(),
};

type DialogPolicy = ApprovalPolicy | null | 'new';

export const PoliciesListPage = ({
  session,
  apiBaseUrl,
  onSaved,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
  onSaved?: (policyId: string) => void;
}) => {
  const companyId = session.activeCompany?.companyId;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] =
    useState<ApprovalPolicyFiltersValue>(emptyApprovalPolicyFilters);
  const [dialogPolicy, setDialogPolicy] = useState<DialogPolicy>(null);
  const { policiesQuery, deactivatePolicyMutation } = useApprovalPoliciesPage(
    { companyId, page, pageSize, search: debouncedSearch },
    apiBaseUrl,
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const allPolicies = useMemo(
    () => sortApprovalPoliciesByUpdatedAtDesc(policiesQuery.data?.items ?? []),
    [policiesQuery.data],
  );

  const policies = useMemo(() => {
    if (filters.status.size === 0) return allPolicies;
    return allPolicies.filter((policy) => {
      const wanted = policy.isActive ? 'active' : 'inactive';
      return filters.status.has(wanted);
    });
  }, [allPolicies, filters]);

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

  const totalPolicies = policiesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalPolicies / pageSize));

  const toggleId = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllOnPage = () => {
    const allOnPageSelected =
      policies.length > 0 &&
      policies.every((policy) => selectedIds.has(policy.id));
    if (allOnPageSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(policies.map((policy) => policy.id)));
  };

  const bulkDeactivate = async () => {
    const ids = [...selectedIds];
    try {
      for (const id of ids) {
        await deactivatePolicyMutation.mutateAsync({
          companyId,
          policyId: id,
        });
      }
      toast.success('Políticas desactivadas', {
        description: `${ids.length} registros actualizados`,
      });
      setSelectedIds(new Set());
    } catch {
      // Mantener la selección para reintentar.
    }
  };

  const openCreate = () => setDialogPolicy('new');
  const openEdit = (policy: ApprovalPolicy) => setDialogPolicy(policy);
  const closeDialog = () => setDialogPolicy(null);

  return (
    <div className="space-y-4">
      <div className="mt-0 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-xl font-medium tracking-tight">Políticas</h2>
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="h-10 w-full border px-4 rounded-2xl justify-start flex items-center">
              <Search size={18} color="#000" />
              <Input
                aria-label="Buscar políticas"
                className="h-10 placeholder:truncate placeholder:text-xs border-none text-sm focus-visible:border-none focus-visible:outline-none"
                placeholder="Buscar por nombre o id"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <ApprovalPolicyFilters
            value={filters}
            onChange={setFilters}
            onClear={() => setFilters(emptyApprovalPolicyFilters)}
          />
        </div>
      </div>

      {totalPolicies === 0 && filters.status.size === 0 ? (
        <div className="px-5 py-12 text-center">
          <Users className="mx-auto size-8 text-muted-foreground/50" />
          <h3 className="text-xl font-medium tracking-tight">
            Todavía no se crearon políticas de aprobación
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            Definí la primera política con el botón “Crear política”.
          </p>
        </div>
      ) : policies.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <h3 className="text-xl flex items-center justify-center gap-2 font-medium tracking-tight">
            <CircleAlert size={18} color="#000" /> No encontramos políticas con esos filtros
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            Limpiá los filtros para ver todas las políticas.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader className="bg-[#f6f6f6] rounded-2xl">
            <TableRow>
              <TableHead className="h-11 w-10 pl-5">
                <Checkbox
                  aria-label="Seleccionar página"
                  checked={
                    policies.length > 0 &&
                    policies.every((policy) => selectedIds.has(policy.id))
                  }
                  onCheckedChange={toggleAllOnPage}
                />
              </TableHead>
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
              <TableRow key={policy.id}>
                <TableCell className="pl-5">
                  <Checkbox
                    aria-label={`Seleccionar política ${policy.name}`}
                    checked={selectedIds.has(policy.id)}
                    onCheckedChange={() => toggleId(policy.id)}
                  />
                </TableCell>
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
                      onClick={() => openEdit(policy)}
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

      {selectedIds.size > 0 ? (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-xl">
            <span className="text-sm font-medium">
              {selectedIds.size} seleccionados
            </span>
            <span aria-hidden className="h-5 w-px bg-border" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-2xl"
              onClick={() => void bulkDeactivate()}
              disabled={deactivatePolicyMutation.isPending}
            >
              <Trash2 className="size-4" />
              Desactivar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-2xl"
              onClick={() => setSelectedIds(new Set())}
            >
              Limpiar
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={dialogPolicy !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent
          hideCloseButton
          className="gap-0 overflow-hidden border-0 p-0 sm:max-w-4xl"
        >
          <DialogTitle className="sr-only">
            {dialogPolicy === 'new'
              ? 'Crear política de aprobación'
              : 'Editar política de aprobación'}
          </DialogTitle>
          <div className="grid sm:grid-cols-[2fr_3fr]">
            <div className="relative hidden overflow-hidden sm:block">
              <img
                src="/bg__employees-bw.svg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="max-h-[90vh] overflow-y-auto">
              <PolicyFormPage
                key={
                  dialogPolicy === 'new' || dialogPolicy === null
                    ? 'new-policy'
                    : dialogPolicy.id
                }
                session={session}
                {...(apiBaseUrl ? { apiBaseUrl } : {})}
                policy={dialogPolicy === 'new' || dialogPolicy === null ? null : dialogPolicy}
                onSaved={(policyId) => {
                  onSaved?.(policyId);
                  closeDialog();
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <HoverExpandFab
        label="Crear política"
        icon={<Plus className="size-6" />}
        onClick={openCreate}
      />

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
