import type { ReactNode } from 'react';

export const HoverExpandFab = ({
  label,
  icon,
  onClick,
  ariaLabel,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  ariaLabel?: string;
}) => {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      className="group fixed bottom-6 right-6 z-30 flex h-14 items-center overflow-hidden rounded-full bg-primary text-white shadow-lg transition-[width,background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-primary/90 active:scale-95"
    >
      <span className="flex size-14 shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-90">
        {icon}
      </span>
      <span className="block max-w-0 overflow-hidden whitespace-nowrap pr-0 pl-0 text-sm font-medium opacity-0 transition-[max-width,padding,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:max-w-[200px] group-hover:pl-3 group-hover:pr-5 group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
};
