import type { ReactNode } from 'react';

import { useDesktopAccess } from './use-desktop-access';

export const DesktopGate = ({ children }: { children: ReactNode }) => {
  const hasDesktopAccess = useDesktopAccess();

  if (!hasDesktopAccess) {
    return (
      <main>
        <h1>Desktop browser required</h1>
        <p>Please continue from a desktop or laptop browser to use Vimcore ERP.</p>
      </main>
    );
  }

  return <>{children}</>;
};
