import { useState } from 'react';

import type { AuthSession } from '../../auth/domain/auth';
import { useLogout } from '../../auth/presentation/use-auth';
import {
  paletteValues,
  type PaletteId,
} from '../../onboarding/domain/onboarding';
import {
  usePalettePreference,
  useUpdatePalettePreference,
} from '../../onboarding/presentation/use-onboarding';
import { usePalette } from '../../theme/presentation/theme-context';
import {
  adminWorkspaceLinks,
  canViewAdminSignals,
  getVisibleDashboardModules,
} from '../domain/dashboard';
import {
  useDashboardNotifications,
  useDashboardSummary,
} from './use-dashboard';

export const DashboardPage = ({
  session,
  apiBaseUrl,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
}) => {
  const logout = useLogout(apiBaseUrl);
  const palettePreference = usePalettePreference(apiBaseUrl);
  const updatePalettePreference = useUpdatePalettePreference(apiBaseUrl);
  const { paletteId } = usePalette();
  const [draftPaletteId, setDraftPaletteId] = useState<PaletteId>(paletteId);
  const isPlatformAdmin = canViewAdminSignals(session);
  const modules = getVisibleDashboardModules(session);
  const summary = useDashboardSummary(apiBaseUrl, isPlatformAdmin);
  const notifications = useDashboardNotifications(apiBaseUrl, isPlatformAdmin);

  const selectedPaletteId =
    draftPaletteId === paletteId
      ? palettePreference.data?.paletteId ?? draftPaletteId
      : draftPaletteId;

  return (
    <main>
      <h1>ERP dashboard</h1>
      <p>{session.user.email}</p>

      <aside>
        <h2>Modules</h2>
        <nav aria-label="Dashboard modules">
          <ul>
            {modules.map((module) => (
              <li key={module.id}>
                <a href={`#${module.id}`}>{module.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {isPlatformAdmin ? (
        <section>
          <h2>Platform overview</h2>
          <article>
            <h3>Total companies</h3>
            <p>{summary.data?.totalCompanies ?? 0}</p>
          </article>
          <article>
            <h3>Operational notifications</h3>
            <p>{summary.data?.notificationCount ?? 0}</p>
          </article>
          <article>
            <h3>Audit events</h3>
            <p>{summary.data?.auditEventCount ?? 0}</p>
          </article>
          <ul>
            {notifications.data?.notifications.map((notification) => (
              <li key={notification.id}>{notification.message}</li>
            ))}
          </ul>

          <section>
            <h3>Observability workspace</h3>
            <ul>
              {adminWorkspaceLinks.map((link) => (
                <li key={link.id}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </section>
        </section>
      ) : (
        <section>
          <h2>Company modules</h2>
          <p>Pick a module from the sidebar to continue your ERP setup.</p>
        </section>
      )}

      <label>
        <span>Palette preference</span>
        <select
          aria-label="Palette preference"
          value={selectedPaletteId}
          onChange={(event) => setDraftPaletteId(event.target.value as PaletteId)}
        >
          {paletteValues.map((palette) => (
            <option key={palette} value={palette}>
              {palette}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => updatePalettePreference.mutate(draftPaletteId)}
      >
        Save palette
      </button>
      <button type="button" onClick={() => logout.mutate()}>
        Sign out
      </button>
    </main>
  );
};
