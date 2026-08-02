import { Braces } from 'lucide-react';

import { Card } from '../../../shared/ui/card';

export const JsonRecordView = ({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown> | null;
}) => {
  if (!value) {
    return (
      <section className="rounded-lg border border-dashed bg-muted/20 p-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h3>
        <p className="mt-2 text-sm text-muted-foreground">No hay detalle disponible.</p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Braces className="size-3.5" />{label}</h3>
      <Card className="overflow-hidden bg-zinc-950 text-zinc-100">
        <pre className="max-h-64 overflow-auto p-4 font-mono text-xs leading-6">{JSON.stringify(value, null, 2)}</pre>
      </Card>
    </section>
  );
};
