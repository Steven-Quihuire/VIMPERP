import { Link, useParams } from 'react-router-dom';

import { JsonRecordView } from './json-record-view';
import { useProvisioningRunsWorkspace } from './use-admin-observability';

export const ProvisioningRunDetailPage = ({
  apiBaseUrl,
}: {
  apiBaseUrl?: string;
}) => {
  const { id = '' } = useParams();
  const { detailQuery } = useProvisioningRunsWorkspace({
    apiBaseUrl,
    isPlatformAdmin: true,
    filters: {},
    runId: id,
  });

  return (
    <main>
      <h1>Provisioning run detail</h1>
      <p>
        <Link to="/dashboard/admin/provisioning-runs">Back to provisioning runs</Link>
      </p>

      {detailQuery.isLoading ? <p>Loading provisioning run detail...</p> : null}

      {detailQuery.data ? (
        <>
          <dl>
            <div>
              <dt>Run ID</dt>
              <dd>{detailQuery.data.id}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{detailQuery.data.status}</dd>
            </div>
            <div>
              <dt>Error summary</dt>
              <dd>{detailQuery.data.errorSummary ?? 'No error summary recorded.'}</dd>
            </div>
          </dl>

          <section>
            <h2>Recorded steps</h2>
            <ul>
              {detailQuery.data.steps.map((step) => (
                <li key={step.id}>
                  <article>
                    <h3>{step.name}</h3>
                    <p>{step.status}</p>
                    <JsonRecordView label="Step detail" value={step.detail} />
                  </article>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
};
