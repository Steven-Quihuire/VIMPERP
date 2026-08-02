import { Link, useParams } from 'react-router-dom';

import { JsonRecordView } from './json-record-view';
import { useAuditEventsWorkspace } from './use-admin-observability';

export const AuditEventDetailPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const { id = '' } = useParams();
  const { detailQuery } = useAuditEventsWorkspace({
    apiBaseUrl,
    isPlatformAdmin: true,
    filters: {},
    eventId: id,
  });

  return (
    <main>
      <h1>Detalle del evento de auditoría</h1>
      <p>
        <Link to="/dashboard/admin/audit-events">Volver a eventos de auditoría</Link>
      </p>

      {detailQuery.isLoading ? <p>Cargando detalle del evento...</p> : null}

      {detailQuery.data ? (
        <>
          <dl>
            <div>
              <dt>Event ID</dt>
              <dd>{detailQuery.data.id}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{detailQuery.data.type}</dd>
            </div>
            <div>
              <dt>Correlation ID</dt>
              <dd>{detailQuery.data.correlationId ?? 'Not available.'}</dd>
            </div>
          </dl>

          <JsonRecordView label="Details" value={detailQuery.data.details} />
          <JsonRecordView label="Old values" value={detailQuery.data.oldValues} />
          <JsonRecordView label="New values" value={detailQuery.data.newValues} />
        </>
      ) : null}
    </main>
  );
};
