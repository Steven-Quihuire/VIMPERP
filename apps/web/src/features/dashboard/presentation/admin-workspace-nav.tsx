import { Link } from 'react-router-dom';

import { adminWorkspaceLinks } from '../domain/dashboard';

export const AdminWorkspaceNav = () => (
  <nav aria-label="Admin observability navigation" className="mb-6 border-b pb-3">
    <ul className="flex flex-wrap gap-4 text-sm text-muted-foreground">
      {adminWorkspaceLinks.map((link) => (
        <li key={link.id}>
          <Link className="transition-colors hover:text-foreground" to={link.href}>{link.label}</Link>
        </li>
      ))}
    </ul>
    <p className="mt-3 text-sm text-muted-foreground">Administra senales operativas, errores tecnicos y trazabilidad del sistema.</p>
  </nav>
);
