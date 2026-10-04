// Loading state (pattern P10): skeleton rows shaped like a list, announced as busy.
import { useTranslation } from 'react-i18next';
import { Skeleton } from './skeleton';

export type LoadingProps = {
  rows?: number;
  /** Accessible label; defaults to "Đang tải". */
  label?: string;
};

const WIDTHS = [
  ['w-[70%]', 'w-[45%]'],
  ['w-[60%]', 'w-[35%]'],
  ['w-[75%]', 'w-[40%]'],
] as const;

export function Loading({ rows = 3, label }: LoadingProps) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" aria-label={label ?? t('state.loading')} className="flex flex-col gap-4">
      <Skeleton shape="title" className="w-[40%]" />
      {Array.from({ length: rows }, (_, i) => {
        const [first, second] = WIDTHS[i % WIDTHS.length]!;
        return (
          <div key={i} className="flex items-center gap-3">
            <Skeleton shape="circle" />
            <span className="flex flex-1 flex-col gap-2">
              <Skeleton className={first} />
              <Skeleton className={second} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
