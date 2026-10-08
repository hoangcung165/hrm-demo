// Library component "Select", `searchable` variant: a search box beside the Select, for a list too long to scroll
// (people). The consumer runs the search and passes the matches; `noneLabel` adds a first option for "nobody".
// `onEngage` says when the user first focuses either control, so the matches can be loaded only then.
import { Search } from 'lucide-react';
import type { Ref } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Select, type SelectOption } from './select';

export type SearchSelectProps = {
  /** Links the Select to a Field label. */
  id?: string;
  /** `''`: nothing chosen (or the `noneLabel` option). */
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  search: string;
  onSearch: (search: string) => void;
  /** Names the search box and is its placeholder: "Tìm theo tên hoặc mã". */
  searchLabel: string;
  placeholder: string;
  /** A first option that clears the choice: "Chưa có Trưởng đơn vị". */
  noneLabel?: string;
  onEngage?: () => void;
  invalid?: boolean;
  disabled?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
  ref?: Ref<HTMLButtonElement>;
  className?: string;
};

/** The value of the `noneLabel` option: the Select has no empty value. */
const NONE = '__none__';

export function SearchSelect({ id, value, onChange, options, search, onSearch, searchLabel, placeholder, noneLabel, onEngage, invalid, disabled, ref, className, ...aria }: SearchSelectProps) {
  const all = noneLabel ? [{ value: NONE, label: noneLabel }, ...options] : options;
  return (
    <div className={cn('flex flex-col gap-2 md:flex-row', className)} onFocus={onEngage}>
      <Input
        type="search"
        aria-label={searchLabel}
        placeholder={searchLabel}
        value={search}
        disabled={disabled}
        onChange={(event) => onSearch(event.target.value)}
        leading={<Search aria-hidden="true" />}
        wrapperClassName="md:w-64 max-md:h-11"
        className="[&::-webkit-search-cancel-button]:hidden"
      />
      <Select
        {...aria}
        id={id}
        ref={ref}
        invalid={invalid}
        disabled={disabled}
        value={value || (noneLabel ? NONE : '')}
        onChange={(next) => onChange(next === NONE ? '' : next)}
        options={all}
        placeholder={placeholder}
        className="min-w-0 flex-1 max-md:h-11"
      />
    </div>
  );
}
