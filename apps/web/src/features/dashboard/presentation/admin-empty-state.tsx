export const AdminEmptyState = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => (
  <section aria-label={title}>
    <h2>{title}</h2>
    <p>{message}</p>
  </section>
);
