import {
  CircleSlash,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';

import { Card } from '@/shared/ui/card';

export type EmployeeStats = {
  total: number;
  active: number;
  suspended: number;
  separated: number;
  hiredThisMonth: number;
};

const statCards = [
  {
    id: 'total',
    label: 'Total de empleados',
    icon: Users,
    className: 'bg-primary/5 text-primary',
  },
  {
    id: 'active',
    label: 'Activos',
    icon: UserCheck,
    className: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'suspended',
    label: 'Suspendidos',
    icon: UserMinus,
    className: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'separated',
    label: 'Desvinculados',
    icon: CircleSlash,
    className: 'bg-rose-50 text-rose-700',
  },
] as const;

export const EmployeeStatsCards = ({ stats }: { stats: EmployeeStats }) => {
  const values: Record<(typeof statCards)[number]['id'], number> = {
    total: stats.total,
    active: stats.active,
    suspended: stats.suspended,
    separated: stats.separated,
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.id}
            className="flex items-center gap-3 rounded-2xl border-black/10 p-4"
          >
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${card.className}`}
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-black/45">{card.label}</p>
              <p className="text-xl font-semibold tracking-tight">
                {values[card.id]}
              </p>
            </div>
          </Card>
        );
      })}
      <Card className="flex items-center gap-3 rounded-2xl border-black/10 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <UserPlus className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-black/45">Nuevos este mes</p>
          <p className="text-xl font-semibold tracking-tight">
            {stats.hiredThisMonth}
          </p>
        </div>
      </Card>
    </div>
  );
};
