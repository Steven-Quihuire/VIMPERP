import { Link } from 'react-router-dom';

import { adminWorkspaceLinks } from '../domain/dashboard';

export const AdminWorkspaceNav = () => (
  <nav aria-label="Admin observability navigation">
    <ul>
      {adminWorkspaceLinks.map((link) => (
        <li key={link.id}>
          <Link to={link.href}>{link.label}</Link>
          <p>{link.description}</p>
        </li>
      ))}
    </ul>
  </nav>
);
