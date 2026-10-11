import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

export type SelectOption<T extends string> = { value: T; label: string };

export default function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const selected = options.find((option) => option.value === value) || options[0];
  const listId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-options`;

  useEffect(() => {
    if (!open) return;

    selectedRef.current?.focus();

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnPointerDown);
    return () => document.removeEventListener('pointerdown', closeOnPointerDown);
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={rootRef} onKeyDown={handleKeyDown} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-[#353A42] bg-black px-3 text-left text-xs uppercase text-white focus:outline-none focus:ring-2 focus:ring-[#4ADE80]"
      >
        <span className="truncate">{selected.label}</span>
        <span aria-hidden="true" className="text-[#4ADE80]">⌄</span>
      </button>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-72 overflow-y-auto rounded-md border border-[#353A42] bg-[#0B0D10] p-1 shadow-2xl shadow-black/70 md:max-h-64"
        >
          {options.map((option) => (
            <button
              key={option.value}
              ref={option.value === value ? selectedRef : undefined}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex min-h-10 w-full items-center rounded px-3 text-left text-xs uppercase tracking-[0.08em] focus:outline-none focus:ring-2 focus:ring-[#4ADE80] ${
                option.value === value ? 'bg-[#1A1D22] text-[#4ADE80]' : 'text-[#ECEAE4] hover:bg-[#111317]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
