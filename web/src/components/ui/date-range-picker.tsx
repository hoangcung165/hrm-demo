// Library component "Date field", range variant: a control showing dd/MM/yyyy – dd/MM/yyyy that opens a calendar.
import { Calendar } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useId } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { enUS, vi } from 'react-day-picker/locale';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export type DateRangeValue = { from?: Date; to?: Date };

export type DateRangePickerProps = {
  label: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** Error text under the field; says the cause and the fix. */
  error?: string;
  className?: string;
};

const dayButton =
  'grid size-8 cursor-pointer place-items-center rounded-sm tabular-nums hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-ink-muted';

export function DateRangePicker({ label, value, onChange, error, className }: DateRangePickerProps) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const text =
    value.from && value.to
      ? `${formatDate(value.from)} – ${formatDate(value.to)}`
      : value.from
        ? `${formatDate(value.from)} – …`
        : null;
  return (
    <div className={cn('flex w-[280px] flex-col gap-1', className)}>
      <span id={`${id}-label`} className="text-[14px] leading-5 font-medium text-ink">
        {label}
      </span>
      <Popover.Root>
        <Popover.Trigger
          aria-labelledby={`${id}-label ${id}-value`}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'flex h-10 cursor-pointer items-center justify-between gap-2 rounded-sm border border-line bg-surface px-3 text-left text-ink',
            error && 'border-danger',
          )}
        >
          <span id={`${id}-value`} className={cn('tabular-nums', !text && 'text-ink-muted')}>
            {text ?? t('dateRange.placeholder')}
          </span>
          <Calendar aria-hidden="true" className="size-4 shrink-0 stroke-[1.5] text-ink-muted" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="start" sideOffset={4} className="z-50 rounded-md border border-line bg-surface p-3 shadow-lg">
            <DayPicker
              mode="range"
              locale={i18n.language === 'en' ? enUS : vi}
              weekStartsOn={1}
              defaultMonth={value.from}
              selected={value.from ? ({ from: value.from, to: value.to } satisfies DateRange) : undefined}
              onSelect={(range) => onChange({ from: range?.from, to: range?.to })}
              classNames={{
                months: 'relative',
                month_caption: 'mb-2 flex h-8 items-center justify-center font-medium',
                nav: 'absolute inset-x-0 top-0 flex justify-between',
                button_previous: dayButton,
                button_next: dayButton,
                chevron: 'size-4 fill-ink-muted',
                weekday: 'py-1 text-caption text-ink-muted',
                day: 'p-px text-center text-[13px]',
                day_button: dayButton,
                today: '[&>button]:shadow-[inset_0_0_0_1px_var(--brand-blue)]',
                outside: 'text-ink-muted',
                range_start: '[&>button]:bg-brand-blue [&>button]:text-on-brand [&>button]:hover:bg-brand-blue',
                range_end: '[&>button]:bg-brand-blue [&>button]:text-on-brand [&>button]:hover:bg-brand-blue',
                range_middle: '[&>button]:bg-brand-blue-soft',
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {error ? (
        <span id={`${id}-error`} role="alert" className="text-caption text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}
