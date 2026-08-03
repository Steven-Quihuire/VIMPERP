import { Link, useParams } from 'react-router-dom';

import { JsonRecordView } from './json-record-view';
import { useApplicationErrorsWorkspace } from './use-admin-observability';

export const ApplicationErrorDetailPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const { id = '' } = useParams();
  const { detailQuery } = useApplicationErrorsWorkspace({
    apiBaseUrl,
    isPlatformAdmin: true,
    filters: {},
    errorId: id,
  });

  return (
    <main>
      <h1>Detalle del error de aplicación</h1>
      <p>
        <Link to="/dashboard/admin/application-errors">
          Volver a errores de aplicación
        </Link>
      </p>

      {detailQuery.isLoading ? <p>Cargando detalle del error...</p> : null}

      {detailQuery.data ? (
        <>
          <dl>
            <div>
              <dt>Error ID</dt>
              <dd>{detailQuery.data.id}</dd>
            </div>
            <div>
              <dt>Code</dt>
              <dd>{detailQuery.data.code}</dd>
            </div>
            <div>
              <dt>Message</dt>
              <dd>{detailQuery.data.message}</dd>
            </div>
            <div>
              <dt>Stack</dt>
              <dd>{detailQuery.data.stack ?? 'Not available.'}</dd>
            </div>
          </dl>

          <JsonRecordView
            label="Sanitized context"
            value={detailQuery.data.context}
          />
        </>
      ) : null}
    </main>
  );
};
