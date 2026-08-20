import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { Employee } from '../../domain/employees';
import type { Position } from '../../domain/positions';
import type { OrgTreeNode } from '@/features/org-tree/domain/org-tree';
import { scopeTypeLabels } from '../pages/assignment-timeline';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

const noneOption = '__none__';
const selectItemClassName =
  'focus:bg-foreground focus:text-background data-[highlighted]:bg-foreground data-[highlighted]:text-background';

export type AssignmentFieldValues = {
  positionId: string;
  managerId?: string | undefined;
  scopeNodeId: string;
};

export type AssignmentFieldsErrors = {
  positionId?: string | undefined;
  managerId?: string | undefined;
  scopeNodeId?: string | undefined;
};

type ScopeOption = { node: OrgTreeNode; depth: number };

const toErrorList = (message?: string) => (message ? [{ message }] : []);

export const AssignmentFields = ({
  positions,
  managers = [],
  scopeOptions,
  scopeLoading = false,
  scopeError = false,
  values,
  onPositionChange,
  onManagerChange,
  onScopeChange,
  errors,
  showManager = true,
  scopeEmptyAction,
  positionEmptyAction,
}: {
  positions: Position[];
  managers?: Employee[];
  scopeOptions: ScopeOption[];
  scopeLoading?: boolean;
  scopeError?: boolean;
  values: AssignmentFieldValues;
  onPositionChange: (value: string) => void;
  onManagerChange?: (value: string) => void;
  onScopeChange: (value: string) => void;
  errors?: AssignmentFieldsErrors;
  showManager?: boolean;
  scopeEmptyAction?: ReactNode;
  positionEmptyAction?: ReactNode;
}) => {
  const activePositions = positions.filter((position) => position.isActive);
  const scopeHasOptions = !scopeLoading && !scopeError && scopeOptions.length > 0;

  return (
    <FieldGroup className="mt-8 grid gap-8 sm:grid-cols-2">
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="assignment-position">Puesto</FieldLabel>
        <FieldContent>
          {activePositions.length > 0 ? (
            <Select
              value={values.positionId || noneOption}
              onValueChange={(value) =>
                onPositionChange(value === noneOption ? '' : value)
              }
            >
              <SelectTrigger
                id="assignment-position"
                aria-label="Puesto"
                className="cursor-pointer"
              >
                <SelectValue placeholder="Elegí un puesto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className={selectItemClassName} value={noneOption}>
                  Elegí un puesto
                </SelectItem>
                {activePositions.map((position) => (
                  <SelectItem
                    key={position.id}
                    className={selectItemClassName}
                    value={position.id}
                  >
                    {position.name} · {position.remainingVacancies} vacantes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              Todavía no creaste ningún puesto. Crealo para asignárselo al
              empleado.
              {positionEmptyAction ? (
                <div className="mt-2">
                  <Link
                    to="/dashboard/hr/positions"
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    Ir a Puestos
                  </Link>
                </div>
              ) : null}
            </div>
          )}
          <FieldError errors={toErrorList(errors?.positionId)} />
        </FieldContent>
      </Field>

      {showManager ? (
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="assignment-manager">Encargado</FieldLabel>
          <FieldContent>
            <Select
              value={values.managerId || noneOption}
              onValueChange={(value) =>
                onManagerChange?.(value === noneOption ? '' : value)
              }
            >
              <SelectTrigger
                id="assignment-manager"
                aria-label="Encargado"
                className="cursor-pointer"
              >
                <SelectValue placeholder="Sin encargado asignado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className={selectItemClassName} value={noneOption}>
                  Sin encargado asignado
                </SelectItem>
                {managers.map((employee) => (
                  <SelectItem
                    key={employee.id}
                    className={selectItemClassName}
                    value={employee.id}
                  >
                    {employee.fullName || employee.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={toErrorList(errors?.managerId)} />
          </FieldContent>
        </Field>
      ) : null}

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="assignment-scope-node">
          Ubicación / alcance
        </FieldLabel>
        <FieldContent>
          {scopeLoading ? (
            <p className="text-sm text-muted-foreground">
              Cargando ubicaciones…
            </p>
          ) : scopeError ? (
            <div className="rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-3 text-sm text-muted-foreground">
              No se pudo cargar la estructura organizacional. Reintentá más
              tarde.
            </div>
          ) : scopeHasOptions ? (
            <Select
              value={values.scopeNodeId || noneOption}
              onValueChange={(value) =>
                onScopeChange(value === noneOption ? '' : value)
              }
            >
              <SelectTrigger
                id="assignment-scope-node"
                aria-label="Dónde trabaja"
                className="cursor-pointer"
              >
                <SelectValue placeholder="Elegí dónde trabaja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className={selectItemClassName} value={noneOption}>
                  Elegí dónde trabaja
                </SelectItem>
                {scopeOptions.map(({ node, depth }) => (
                  <SelectItem
                    key={`${node.ref.scopeType}:${node.ref.scopeId}`}
                    className={selectItemClassName}
                    value={`${node.ref.scopeType}:${node.ref.scopeId}`}
                  >
                    {'— '.repeat(depth)}
                    {node.name} · {scopeTypeLabels[node.ref.scopeType]} (
                    {node.employeeCount ?? 0} empleados)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              Todavía no creaste la estructura (locales, áreas, almacenes).
              Creala para decir dónde trabaja el empleado.
              {scopeEmptyAction ? (
                <div className="mt-2">
                  <Link
                    to="/dashboard/organization"
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    Ir a Organización
                  </Link>
                </div>
              ) : null}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Elegí una ubicación de la estructura organizacional. No hace falta
            escribir el ID.
          </p>
          <FieldError errors={toErrorList(errors?.scopeNodeId)} />
        </FieldContent>
      </Field>
    </FieldGroup>
  );
};
