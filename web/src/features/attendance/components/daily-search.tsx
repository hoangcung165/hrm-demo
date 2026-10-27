// The search box of the filter bar: the text is the user's own while they type and goes to the URL after a pause.
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/lib/use-debounced-value';

export type DailySearchProps = { value: string; onCommit: (text: string) => void; className?: string };

export function DailySearch({ value, onCommit, className }: DailySearchProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const settled = useDebouncedValue(text.trim(), 300);
  // The URL changed from elsewhere ("Xóa bộ lọc"): follow it.
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (settled !== value && settled === text.trim()) onCommit(settled);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a pause in typing commits
  }, [settled]);
  return (
    <Input
      type="search"
      aria-label={t('attendanceDaily.filter.search')}
      placeholder={t('attendanceDaily.filter.searchPlaceholder')}
      leading={<Search aria-hidden="true" />}
      value={text}
      onChange={(event) => setText(event.target.value)}
      wrapperClassName={className}
    />
  );
}
