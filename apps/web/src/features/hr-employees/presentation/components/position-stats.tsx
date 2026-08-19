import { BriefcaseBusiness, CircleSlash, UserCheck, Users } from 'lucide-react';

import { Card } from '@/shared/ui/card';

import type { Position } from '../../domain/positions';

export const PositionStatsCards = ({ positions }: { positions: Position[] }) => {
  const total = positions.length;
  const active = positions.filter((position) => position.isActive).length;
  const inactive = total - active;
  const vacancies = positions.reduce(
    (sum, position) => sum + position.remainingVacancies,
    0,
  );

  const cards = [
    {
      id: 'total',
      label: 'Total de puestos',
      value: total,
      icon: BriefcaseBusiness,
      className: 'bg-primary/5 text-primary',
    },
    {
      id: 'active',
      label: 'Activos',
      value: active,
      icon: UserCheck,
      className: 'bg-emerald-50 text-emerald-700',
    },
    {
      id: 'inactive',
      label: 'Inactivos',
      value: inactive,
      icon: CircleSlash,
      className: 'bg-gray-50 text-gray-600',
    },
    {
      id: 'vacancies',
      label: 'Vacantes disponibles',
      value: vacancies,
      icon: Users,
      className: 'bg-sky-50 text-sky-700',
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
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
                {card.value}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
