import { Inbox } from 'lucide-react';

export const AdminEmptyState = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => (
  <section aria-label={title} className="rounded-xl border border-dashed bg-muted/20 p-10 text-center">
    <Inbox className="mx-auto mb-3 size-8 text-muted-foreground" />
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{message}</p>
  </section>
);
