// Library component "Date + day-part control" (design #18): a Date field and a 128px Select side by side, under one
// label: "Từ ngày *" 30/10/2026 · Buổi chiều. The Select is named by `partLabel`, since only the date has the label.
import { Field } from './field';
import { Input } from './input';
import { Select, type SelectOption } from './select';

export type DatePartFieldProps = {
  label: string;
  required?: boolean;
  /** `yyyy-MM-dd`, or `''`. */
  date: string;
  onDateChange: (date: string) => void;
  part: string;
  onPartChange: (part: string) => void;
  partOptions: SelectOption[];
  /** Names the Select: "Buổi của ngày đầu". */
  partLabel: string;
  min?: string;
  error?: string;
  /** The date is the cause of a problem said elsewhere (an alert under the fields): red border, no text of its own. */
  invalid?: boolean;
  helper?: string;
  className?: string;
};

export function DatePartField({ label, required, date, onDateChange, part, onPartChange, partOptions, partLabel, min, error, invalid: flagged = false, helper, className }: DatePartFieldProps) {
  return (
    <Field label={label} required={required} error={error} helper={helper} className={className}>
      {({ invalid, ...control }) => (
        <div className="flex gap-2">
          <Input {...control} type="date" value={date} min={min} invalid={invalid || flagged} onChange={(event) => onDateChange(event.target.value)} wrapperClassName="min-w-0 flex-1 max-md:h-11" />
          <Select aria-label={partLabel} value={part} onChange={onPartChange} options={partOptions} placeholder={partLabel} disabled={partOptions.length < 2} className="w-32 shrink-0 max-md:h-11" />
        </div>
      )}
    </Field>
  );
}
