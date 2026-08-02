import { CheckCircle2, Clock3, FileText, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { Badge } from '../../../shared/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card';
import { JsonRecordView } from './json-record-view';
import { useProvisioningRunsWorkspace } from './use-admin-observability';

const statusCopy = {
  running: 'En ejecución',
  succeeded: 'Completado',
  failed: 'Fallido',
  incomplete: 'Incompleto',
} as const;

const stepStatusCopy = {
  pending: 'Pendiente',
  succeeded: 'Completado',
  failed: 'Fallido',
  skipped: 'Omitido',
} as const;

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

  const run = detailQuery.data;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        <Link className="w-fit text-sm font-medium text-primary hover:underline" to="/dashboard/admin/provisioning-runs">
          ← Volver a procesos de alta
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Observabilidad / Procesos de alta</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Detalle del proceso</h1>
            {run ? <p className="mt-1 text-muted-foreground">{run.process}</p> : null}
          </div>
          {run ? (
            <Badge variant={run.status === 'failed' ? 'destructive' : 'secondary'} className="gap-1 px-3 py-1.5">
              {run.status === 'succeeded' ? <CheckCircle2 className="size-4" /> : run.status === 'failed' ? <XCircle className="size-4" /> : <Clock3 className="size-4" />}
              {statusCopy[run.status]}
            </Badge>
          ) : null}
        </div>
      </header>

      {detailQuery.isLoading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Cargando detalle del proceso...</CardContent></Card>
      ) : null}

      {run ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resumen del proceso</CardTitle>
              <CardDescription>Información técnica para seguir el alta de la empresa.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/20 p-4 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ID del proceso</p>
                <p className="mt-1 break-all font-mono text-sm">{run.id}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Correlación</p>
                <p className="mt-1 break-all font-mono text-sm">{run.correlationId}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Intento</p>
                <p className="mt-1 text-lg font-semibold">#{run.attempt}</p>
              </div>
              <div className="rounded-lg border p-4 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resumen del error</p>
                <p className="mt-1 text-sm">{run.errorSummary ?? 'No se registró ningún error.'}</p>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <div>
              <p className="text-sm font-medium text-primary">Trazabilidad</p>
              <h2 className="text-2xl font-semibold tracking-tight">Pasos registrados</h2>
            </div>
            <ol className="relative space-y-3 border-l pl-6">
              {run.steps.map((step, index) => (
                <li key={step.id} className="relative">
                  <span className="absolute -left-[2.05rem] top-5 flex size-7 items-center justify-center rounded-full border bg-background text-xs font-semibold">
                    {index + 1}
                  </span>
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                      <div className="flex items-start gap-3">
                        <span className="rounded-lg bg-muted p-2"><FileText className="size-4" /></span>
                        <div><CardTitle className="text-base">{step.name}</CardTitle><CardDescription className="mt-1">Intento {step.attempt}</CardDescription></div>
                      </div>
                      <Badge variant={step.status === 'failed' ? 'destructive' : 'secondary'}>{stepStatusCopy[step.status]}</Badge>
                    </CardHeader>
                    <CardContent className="pt-0"><JsonRecordView label="Detalle técnico" value={step.detail} /></CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
    </main>
  );
};
