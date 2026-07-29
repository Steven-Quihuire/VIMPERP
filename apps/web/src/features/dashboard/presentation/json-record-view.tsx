export const JsonRecordView = ({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown> | null;
}) => {
  if (!value) {
    return (
      <section>
        <h3>{label}</h3>
        <p>Not available.</p>
      </section>
    );
  }

  return (
    <section>
      <h3>{label}</h3>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
};
