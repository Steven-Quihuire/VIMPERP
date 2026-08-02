import { Link } from 'react-router-dom';

import { Card, CardContent } from '../../../shared/ui/card';
import { adminWorkspaceLinks } from '../domain/dashboard';

export const AdminWorkspaceNav = () => (
  <nav aria-label="Navegación de observabilidad" className="mb-6">
    <Card className="bg-muted/30">
      <CardContent className="flex flex-wrap items-center gap-2 p-3">
        <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Centro de control</span>
        <ul className="flex flex-wrap gap-2 text-sm">
      {adminWorkspaceLinks.map((link) => (
        <li key={link.id}>
          <Link className="inline-flex rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-background hover:text-foreground" to={link.href}>{link.label}</Link>
        </li>
      ))}
        </ul>
      </CardContent>
    </Card>
    <p className="mt-3 text-sm text-muted-foreground">Administra señales operativas, errores técnicos y trazabilidad del sistema.</p>
  </nav>
);
