import { Link, useSearchParams } from 'react-router-dom';

import type { ProvisioningRunListFilters } from '../domain/provisioning-runs';
import { AdminEmptyState } from './admin-empty-state';
import { AdminWorkspaceNav } from './admin-workspace-nav';
import { useProvisioningRunsWorkspace } from './use-admin-observability';

const readFilters = (searchParams: URLSearchParams): ProvisioningRunListFilters => ({
  status:
    (searchParams.get('status') as ProvisioningRunListFilters['status'] | null) ??
    undefined,
  correlationId: searchParams.get('correlationId') ?? undefined,
  cursor: searchParams.get('cursor') ?? undefined,
});

export const ProvisioningRunsListPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const [searchParams] = useSearchParams();
  const { listQuery } = useProvisioningRunsWorkspace({
    apiBaseUrl,
    isPlatformAdmin: true,
    filters: readFilters(searchParams),
  });

  return (
    <main>
      <h1>Provisioning runs</h1>
      <p>Inspect append-only onboarding run history and recorded step outcomes.</p>
      <AdminWorkspaceNav />

      {listQuery.isLoading ? <p>Loading provisioning runs...</p> : null}

      {listQuery.data && listQuery.data.items.length === 0 ? (
        <AdminEmptyState
          title="No provisioning runs found"
          message="No provisioning runs match the current filters. Retry and delete actions are not available in the MVP."
        />
      ) : null}

      {listQuery.data && listQuery.data.items.length > 0 ? (
        <ul>
          {listQuery.data.items.map((run) => (
            <li key={run.id}>
              <article>
                <h2>{run.process}</h2>
                <p>{run.errorSummary ?? 'No error summary recorded.'}</p>
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>{run.status}</dd>
                  </div>
                  <div>
                    <dt>Correlation ID</dt>
                    <dd>{run.correlationId}</dd>
                  </div>
                </dl>
                <Link to={`/dashboard/admin/provisioning-runs/${run.id}`}>
                  Open provisioning run {run.id}
                </Link>
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
};
