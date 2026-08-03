import { Link, Outlet } from 'react-router-dom';

export const AuthLayout = () => (
  <div className="relative min-h-dvh">
    <Link
      to="/"
      aria-label="Ir al inicio de Vimcore"
      className="absolute left-4 top-3 z-10 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src="/logo__sintext__vimcore.png"
        alt="Vimcore"
        className="size-8 object-contain"
      />
    </Link>
    <Outlet />
  </div>
);
