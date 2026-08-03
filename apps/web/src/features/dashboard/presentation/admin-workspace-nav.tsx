import { NavLink } from 'react-router-dom';

import { adminWorkspaceLinks } from '../domain/dashboard';

export const AdminWorkspaceNav = () => (
  <nav aria-label="Navegación de administración" className="overflow-x-auto">
    <ul className="flex min-w-max gap-6 text-sm">
      {adminWorkspaceLinks.map((link) => (
        <li key={link.id}>
          <NavLink
            className={({ isActive }) =>
              `inline-flex h-8 items-center whitespace-nowrap border-b-2 px-1 font-medium transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`
            }
            to={link.href}
          >
            {link.label}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
