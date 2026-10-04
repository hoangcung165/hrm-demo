// Library component "Tabs": sections of one record or views of one page. The consumer keeps the active tab in the URL.
import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TabItem<T extends string> = { id: T; label: string; count?: number };

export type TabsProps<T extends string> = {
  /** Accessible name of the tab list. */
  label: string;
  tabs: Array<TabItem<T>>;
  active: T;
  onChange: (id: T) => void;
  /** Content of the active tab. */
  children: ReactNode;
};

export function Tabs<T extends string>({ label, tabs, active, onChange, children }: TabsProps<T>) {
  const base = useId();
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.id === active);
    const next = tabs[(index + step + tabs.length) % tabs.length]!;
    onChange(next.id);
    document.getElementById(`${base}-${next.id}`)?.focus();
  };
  return (
    <>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-6 border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`${base}-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={tab.id === active}
            tabIndex={tab.id === active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-px min-h-11 cursor-pointer border-b-2 border-transparent pt-2 pb-3 text-body-strong text-ink-muted hover:text-ink md:min-h-0',
              tab.id === active && 'border-brand-blue text-brand-blue hover:text-brand-blue',
            )}
          >
            {tab.label}
            {tab.count !== undefined ? <span className="ml-1 text-caption text-ink-muted">{tab.count}</span> : null}
          </button>
        ))}
      </div>
      {/* In the tab order, so a panel without focusable content can still be reached and read. */}
      <div role="tabpanel" tabIndex={0} aria-labelledby={`${base}-${active}`} className="rounded-md">
        {children}
      </div>
    </>
  );
}
