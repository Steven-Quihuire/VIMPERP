import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

import {
  useUpdateEmployee,
} from '../../application/hr-employees-queries';
import {
  toEmployeeFormValues,
  toUpdateEmployeeInput,
  type Employee,
  type EmploymentStatus,
} from '../../domain/employees';

export const EmployeeRowActions = ({
  employee,
  companyId,
  apiBaseUrl,
  onView,
  onRequestDelete,
}: {
  employee: Employee;
  companyId: string;
  apiBaseUrl?: string;
  onView: (employeeId: string) => void;
  onRequestDelete: (employee: Employee) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const updateEmployeeMutation = useUpdateEmployee(apiBaseUrl);

  const changeStatus = async (employmentStatus: EmploymentStatus) => {
    try {
      const baseValues = toEmployeeFormValues(employee);
      await updateEmployeeMutation.mutateAsync(
        toUpdateEmployeeInput(companyId, employee.id, {
          ...baseValues,
          employmentStatus,
        }),
      );
      toast.success(
        employmentStatus === 'active'
          ? 'Empleado activado'
          : employmentStatus === 'suspended'
            ? 'Empleado suspendido'
            : 'Empleado desvinculado',
        { description: employee.fullName || employee.id },
      );
    } catch {
      // El error ya se refleja en el mutation; mantenemos el menú utilizable.
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Acciones de ${employee.fullName || employee.id}`}
          className="size-8 rounded-full"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        <DropdownMenuItem onClick={() => onView(employee.id)}>
          Ver detalles
        </DropdownMenuItem>
        {employee.employmentStatus === 'active' ? (
          <DropdownMenuItem onClick={() => void changeStatus('suspended')}>
            Suspender
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => void changeStatus('active')}>
            Activar
          </DropdownMenuItem>
        )}
        {employee.employmentStatus !== 'separated' ? (
          <DropdownMenuItem onClick={() => void changeStatus('separated')}>
            Desvincular
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onRequestDelete(employee)}
        >
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
