// Library component "Masked value" (pattern P8): a sensitive number shown as "•••• 1234". When the caller may see
// the full value, a ghost Button "Hiện"/"Ẩn" shows it in place (a client-side toggle, no request); without that
// there is no button. A missing value reads as the `emptyText` ("Chưa có").
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export type MaskedValueProps = {
  /** The full value, or the value the API masked; `null` when there is none. */
  value: string | null;
  /** The full value is in hand and may be shown: the toggle is offered. */
  revealable: boolean;
  /** Shown in full now. */
  shown: boolean;
  onToggle: () => void;
  /** Names the toggle: "Hiện số CCCD" / "Ẩn số CCCD". */
  showLabel: string;
  hideLabel: string;
  /** Visible text of the toggle: "Hiện" / "Ẩn". */
  showText: string;
  hideText: string;
  emptyText: string;
  className?: string;
};

/** Four dots and the last four characters, whatever the length: the length of a number is not shown either. */
export const maskValue = (value: string) => `•••• ${value.slice(-4)}`;

export function MaskedValue({ value, revealable, shown, onToggle, showLabel, hideLabel, showText, hideText, emptyText, className }: MaskedValueProps) {
  if (!value) return <span className={cn('text-ink-muted', className)}>{emptyText}</span>;
  const full = revealable && shown;
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-3', className)}>
      <span className="tabular-nums">{full ? value : maskValue(value)}</span>
      {revealable ? (
        <Button variant="ghost" size="sm" aria-pressed={shown} aria-label={shown ? hideLabel : showLabel} onClick={onToggle} className="-my-1 px-2 max-md:h-11 [&_svg]:size-4">
          {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          {shown ? hideText : showText}
        </Button>
      ) : null}
    </span>
  );
}
