import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../../shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/ui/card';
import { useDashboardSummary } from './use-dashboard';

const formatDate = (value: string) => new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(value));

export const AdminCompaniesPage = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const summary = useDashboardSummary(apiBaseUrl, true);
  const companies = summary.data?.companies ?? [];
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? companies[0];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-primary">Administración</p>
        <h1 className="text-3xl font-semibold tracking-tight">Empresas</h1>
        <p className="mt-1 text-muted-foreground">Selecciona una empresa para consultar su información completa.</p>
      </header>

      {summary.isLoading ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Cargando empresas...</CardContent></Card> : null}
      {summary.isError ? <Card><CardContent className="p-8 text-center text-sm text-destructive">No se pudo cargar la información de las empresas. Intenta nuevamente.</CardContent></Card> : null}
      {!summary.isLoading && !summary.isError && companies.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No hay empresas registradas.</CardContent></Card> : null}

      {companies.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <Card>
            <CardHeader><CardTitle>Empresas registradas</CardTitle><CardDescription>Selecciona una empresa</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {companies.map((company) => (
                <button key={company.id} type="button" onClick={() => setSelectedCompanyId(company.id)} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${selectedCompany?.id === company.id ? 'border-primary bg-accent' : ''}`}>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted font-semibold">{company.name.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{company.name}</span><span className="block text-xs text-muted-foreground">{company.city ?? 'Ubicación no registrada'}</span></span>
                  <span className="text-xs text-muted-foreground">{formatDate(company.createdAt)}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {selectedCompany ? (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardDescription>Ficha empresarial</CardDescription><CardTitle>{selectedCompany.name}</CardTitle><p className="mt-1 font-mono text-xs text-muted-foreground">{selectedCompany.id}</p></div><Building2 className="size-5 text-muted-foreground" /></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Identificación legal</p><p className="mt-2 font-medium">{selectedCompany.legalIdentifier ?? 'No registrada'}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Registro</p><p className="mt-2 font-medium">{formatDate(selectedCompany.createdAt)}</p></div>
                <div className="rounded-lg border p-4 sm:col-span-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contacto</p><div className="mt-2 grid gap-2 text-sm sm:grid-cols-2"><span className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" />{selectedCompany.contactEmail ?? 'Sin correo'}</span><span className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" />{selectedCompany.contactPhone ?? 'Sin teléfono'}</span></div></div>
                <div className="rounded-lg border p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ubicación</p><p className="mt-2 flex items-start gap-2 text-sm"><MapPin className="mt-0.5 size-4 text-muted-foreground" />{[selectedCompany.exactLocation, selectedCompany.city, selectedCompany.country].filter(Boolean).join(', ') || 'No registrada'}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Módulo ERP</p><Badge className="mt-2" variant="secondary">{selectedCompany.erpModuleId ?? 'No definido'}</Badge></div>
                <div className="rounded-lg border p-4 sm:col-span-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Servicios</p><div className="mt-2 flex flex-wrap gap-2">{selectedCompany.services?.length ? selectedCompany.services.map((service) => <Badge key={service} variant="outline">{service}</Badge>) : <span className="text-sm text-muted-foreground">Sin servicios registrados</span>}</div></div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </main>
  );
};
