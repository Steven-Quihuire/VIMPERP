import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

export const TablePageSize = ({
  value,
  options,
  onChange,
}: {
  value: number;
  options: readonly number[];
  onChange: (next: number) => void;
}) => {
  return (
    <Select
      value={String(value)}
      onValueChange={(raw) => {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed > 0) {
          onChange(parsed);
        }
      }}
    >
      <SelectTrigger
        aria-label="Filas por página"
        className="h-8 w-auto rounded-md px-2 text-xs"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={String(option)}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
