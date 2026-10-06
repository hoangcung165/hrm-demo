// Library component "Save bar" (`hrm-savebar`): holds the unsaved changes of a page that is edited in place and
// has no form footer. Render it only while there are unsaved changes, a save runs, or a save has failed.
import { CircleAlert, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export type SaveBarProps = {
  /** Accessible name of the region: "Thay đổi chưa lưu". */
  label: string;
  /** The count line: "3 thay đổi chưa lưu ở 2 vai trò"; while saving "Đang lưu 3 thay đổi…". */
  title: string;
  /** What the changes touch: "HR, Kế toán". */
  caption?: string;
  /** A save failed: replaces the title and the caption until the next save or a discard. */
  error?: { title: string; detail: string };
  saving?: boolean;
  discardLabel: string;
  saveLabel: string;
  onDiscard: () => void;
  /** Without it there is nothing to save (the failed changes are gone): only the discard button shows. */
  onSave?: () => void;
  className?: string;
};

// The look of a disabled Button.
const BUSY = 'cursor-not-allowed border-line bg-surface-muted text-ink-muted hover:bg-surface-muted';

export function SaveBar({ label, title, caption, error, saving = false, discardLabel, saveLabel, onDiscard, onSave, className }: SaveBarProps) {
  const Icon = error ? TriangleAlert : CircleAlert;
  return (
    <div
      role="region"
      aria-label={label}
      aria-busy={saving || undefined}
      className={cn(
        // Below 768px: full width at the bottom edge, the text on its own line. The negative offsets take it over
        // the 16px padding of the page, which a sticky box otherwise stays inside.
        'sticky bottom-4 z-3 flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-3 shadow-lg max-md:-mx-4 max-md:-mb-4 max-md:-bottom-4 max-md:flex-wrap max-md:rounded-none max-md:border-x-0 max-md:border-b-0',
        className,
      )}
    >
      {/* Polite, so each new count is read once; a failure is an alert. */}
      <div role={error ? 'alert' : 'status'} className="flex min-w-0 flex-1 items-start gap-2 max-md:basis-full">
        <Icon aria-hidden="true" className={cn('mt-px size-5 shrink-0 stroke-[1.5]', error ? 'text-danger' : 'text-warning')} />
        <div className="min-w-0">
          <div className={cn('text-body-strong', error && 'text-danger')}>{error ? error.title : title}</div>
          {error || caption ? <div className="text-caption text-ink-muted">{error ? error.detail : caption}</div> : null}
        </div>
      </div>
      {/* While saving the buttons look disabled and ignore clicks but stay focusable: focus is not lost mid-save. */}
      <Button variant="secondary" aria-disabled={saving || undefined} onClick={saving ? undefined : onDiscard} className={cn('max-md:h-11 max-md:flex-1', saving && BUSY)}>
        {discardLabel}
      </Button>
      {onSave ? (
        <Button aria-disabled={saving || undefined} onClick={saving ? undefined : onSave} className={cn('max-md:h-11 max-md:flex-1', saving && BUSY)}>
          {saveLabel}
        </Button>
      ) : null}
    </div>
  );
}
