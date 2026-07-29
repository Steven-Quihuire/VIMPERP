import { Link, useSearchParams } from 'react-router-dom';

import type { AuditEventListFilters } from '../domain/audit-events';
import { AdminEmptyState } from './admin-empty-state';
import { AdminWorkspaceNav } from './admin-workspace-nav';
import { useAuditEventsWorkspace } from './use-admin-observability';

const readFilters = (searchParams: URLSearchParams): AuditEventListFilters => ({
  type: searchParams.get('type') ?? undefined,
  companyId: searchParams.get('companyId') ?? undefined,
  correlationId: searchParams.get('correlationId') ?? undefined,
  cursor: searchParams.get('cursor') ?? undefined,
});

export const AuditEventsListPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const [searchParams] = useSearchParams();
  const { listQuery } = useAuditEventsWorkspace({
    apiBaseUrl,
    isPlatformAdmin: true,
    filters: readFilters(searchParams),
  });

  return (
    <main>
      <h1>Audit events</h1>
      <p>Inspect append-only audit history with correlation and entity metadata.</p>
      <AdminWorkspaceNav />

      {listQuery.isLoading ? <p>Loading audit events...</p> : null}

      {listQuery.data && listQuery.data.items.length === 0 ? (
        <AdminEmptyState
          title="No audit events found"
          message="No audit events match the current filters. Retry and delete actions are not available in the MVP."
        />
      ) : null}

      {listQuery.data && listQuery.data.items.length > 0 ? (
        <ul>
          {listQuery.data.items.map((event) => (
            <li key={event.id}>
              <article>
                <h2>{event.type}</h2>
                <dl>
                  <div>
                    <dt>Company ID</dt>
                    <dd>{event.companyId}</dd>
                  </div>
                  <div>
                    <dt>Entity</dt>
                    <dd>{event.entityType ?? 'Not available'}</dd>
                  </div>
                </dl>
                <Link to={`/dashboard/admin/audit-events/${event.id}`}>
                  Open audit event {event.id}
                </Link>
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
};
