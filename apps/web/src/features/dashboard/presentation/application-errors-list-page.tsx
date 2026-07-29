import { Link, useSearchParams } from 'react-router-dom';

import type { ApplicationErrorListFilters } from '../domain/application-errors';
import { AdminEmptyState } from './admin-empty-state';
import { AdminWorkspaceNav } from './admin-workspace-nav';
import { useApplicationErrorsWorkspace } from './use-admin-observability';

const readFilters = (searchParams: URLSearchParams): ApplicationErrorListFilters => ({
  fingerprint: searchParams.get('fingerprint') ?? undefined,
  correlationId: searchParams.get('correlationId') ?? undefined,
  cursor: searchParams.get('cursor') ?? undefined,
});

export const ApplicationErrorsListPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const [searchParams] = useSearchParams();
  const { listQuery } = useApplicationErrorsWorkspace({
    apiBaseUrl,
    isPlatformAdmin: true,
    filters: readFilters(searchParams),
  });

  return (
    <main>
      <h1>Application errors</h1>
      <p>Inspect sanitized technical failures linked to platform correlation identifiers.</p>
      <AdminWorkspaceNav />

      {listQuery.isLoading ? <p>Loading application errors...</p> : null}

      {listQuery.data && listQuery.data.items.length === 0 ? (
        <AdminEmptyState
          title="No application errors found"
          message="No application errors match the current filters. Retry and delete actions are not available in the MVP."
        />
      ) : null}

      {listQuery.data && listQuery.data.items.length > 0 ? (
        <ul>
          {listQuery.data.items.map((error) => (
            <li key={error.id}>
              <article>
                <h2>{error.code}</h2>
                <p>{error.message}</p>
                <dl>
                  <div>
                    <dt>Correlation ID</dt>
                    <dd>{error.correlationId}</dd>
                  </div>
                  <div>
                    <dt>Fingerprint</dt>
                    <dd>{error.fingerprint}</dd>
                  </div>
                </dl>
                <Link to={`/dashboard/admin/application-errors/${error.id}`}>
                  Open application error {error.id}
                </Link>
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
};
