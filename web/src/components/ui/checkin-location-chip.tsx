// Library component "Location chip" (HRM-39, proposed on the main canvas row `#39`, not yet in the HRM design system):
// what the phone's reading says, over the viewfinder of the check-in: the nearest Địa điểm chấm công, whether the
// phone is inside its zone, how far and how exact. The words carry the state; the tone only backs them.
import { LoaderCircle, MapPin, MapPinOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CheckinLocationChipProps = {
  /** `success` inside the zone, `warning` outside it or a poor reading, `neutral` while reading or with no reading. */
  tone: 'neutral' | 'success' | 'warning';
  /** Reading the position: a spinner in place of the pin. */
  busy?: boolean;
  /** No reading: a crossed pin. */
  unavailable?: boolean;
  /** "Văn phòng chính · Trong vùng". */
  title: string;
  /** "Cách 35 m · sai số 12 m". */
  detail?: string;
  className?: string;
};

export function CheckinLocationChip({ tone, busy = false, unavailable = false, title, detail, className }: CheckinLocationChipProps) {
  const Icon = busy ? LoaderCircle : unavailable ? MapPinOff : MapPin;
  return (
    // A polite status: a new reading is announced without taking focus.
    <div role="status" aria-busy={busy || undefined} className={cn('flex items-center gap-2 rounded-md bg-surface px-3 py-2 shadow-sm', className)}>
      <Icon
        aria-hidden="true"
        className={cn(
          'size-5 shrink-0 stroke-[1.5]',
          busy && 'animate-spin text-ink-muted motion-reduce:animate-none',
          !busy && tone === 'success' && 'text-success',
          !busy && tone === 'warning' && 'text-warning',
          !busy && tone === 'neutral' && 'text-ink-muted',
        )}
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-body-small font-semibold [overflow-wrap:anywhere]">{title}</span>
        {detail ? <span className="text-caption text-ink-muted">{detail}</span> : null}
      </span>
    </div>
  );
}
