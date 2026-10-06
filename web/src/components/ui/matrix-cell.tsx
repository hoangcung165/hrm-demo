// One yes / no cell of a matrix: read-only (check or dash), locked (a bare check: granted and fixed), or a
// Checkbox that fills the cell (Table README, "Editable matrix").
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MatrixCellEdit = {
  /** Column then row: "HR: Sửa Thông tin công ty và logo"; a locked cell adds its reason. */
  name: string;
  /** Granted and fixed: no box, and nothing to toggle. */
  locked?: boolean;
  /** Differs from the saved value. */
  changed?: boolean;
};

export type MatrixCellProps = {
  granted: boolean;
  yesLabel: string;
  noLabel: string;
  /** Without it the cell is read-only. */
  edit?: MatrixCellEdit;
  /** A save runs: the box cannot be changed. */
  busy?: boolean;
  /** Id of the hidden text that describes a changed cell. */
  changedId?: string;
  onToggle?: () => void;
  className?: string;
};

/** Brings a focused box into view, clear of the sticky first column, which the browser's own scroll does not know of. */
function reveal(input: HTMLInputElement) {
  // After the browser's scroll to the focused input.
  requestAnimationFrame(() => {
    const label = input.closest('label');
    const lead = input.closest('tr')?.querySelector('th');
    const scroller = input.closest('table')?.parentElement;
    if (!label || !lead || !scroller) return;
    label.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const hidden = lead.getBoundingClientRect().right - label.getBoundingClientRect().left;
    if (hidden > 0) scroller.scrollLeft -= hidden;
  });
}

const BASE = 'border-b border-line text-center align-middle';

export function MatrixCell({ granted, yesLabel, noLabel, edit, busy = false, changedId, onToggle, className }: MatrixCellProps) {
  if (edit && !edit.locked) {
    return (
      <td className={cn(BASE, 'relative p-0', edit.changed && 'bg-warning-soft', className)}>
        {/* The label fills the cell: the whole cell is the target, 46px high at least. Its scroll margin keeps a
            focused cell clear of a Save bar at the bottom of the page (its height plus 16px; taller below 768px). */}
        <label className={cn('group flex min-h-11.5 w-full scroll-mb-24 items-center justify-center max-md:scroll-mb-35', busy ? 'cursor-progress' : 'cursor-pointer')}>
          <input
            type="checkbox"
            className="peer sr-only"
            checked={granted}
            disabled={busy}
            aria-label={edit.name}
            aria-describedby={edit.changed ? changedId : undefined}
            onChange={onToggle}
            onFocus={(event) => reveal(event.currentTarget)}
          />
          <span
            aria-hidden="true"
            className="grid size-4.5 place-items-center rounded-[4px] border-[1.5px] border-ink-muted bg-surface text-on-brand group-hover:border-brand-blue peer-checked:border-brand-blue peer-checked:bg-brand-blue peer-focus-visible:shadow-focus-ring peer-disabled:opacity-45 [&_svg]:size-3.5 [&_svg]:stroke-[2.5]"
          >
            <Check />
          </span>
        </label>
        {edit.changed ? <span aria-hidden="true" className="absolute top-2 right-2 size-1.5 rounded-full bg-warning" /> : null}
      </td>
    );
  }
  // Yes and no differ in shape, not only in colour; never an empty cell. A locked cell is read, not operated.
  return (
    <td className={cn(BASE, 'px-2 py-3', granted && !edit ? 'text-success' : 'text-ink-muted', className)}>
      {granted ? <Check aria-hidden="true" className="inline size-5 stroke-2" /> : <span aria-hidden="true">–</span>}
      <span className="sr-only">{edit ? edit.name : granted ? yesLabel : noLabel}</span>
    </td>
  );
}
