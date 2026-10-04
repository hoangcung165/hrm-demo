// The company in the app shell header: logo and name, the tile alone between md and xl.
import { useTranslation } from 'react-i18next';
import { CompanyMark } from '@/components/ui/company-mark';
import { useCompany } from '@/features/company/api';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';

// Tailwind's md (48rem = 768px) up to just under xl (80rem = 1280px).
const TILE_ONLY = '(min-width: 48rem) and (max-width: 79.99rem)';

export type HeaderCompanyMarkProps = { className?: string };

export function HeaderCompanyMark({ className }: HeaderCompanyMarkProps) {
  const { t } = useTranslation();
  const company = useCompany();
  const tileOnly = useMediaQuery(TILE_ONLY);
  return (
    <CompanyMark
      // A failed fetch shows the fallback tile alone; the header reports no error.
      name={company.data?.name}
      logoUrl={company.data?.logoUrl}
      showName={!tileOnly}
      loading={company.isPending}
      loadingLabel={t('state.loading')}
      // Mobile: takes the free width of the top bar. From md: at most 320px, and it shrinks before the search field.
      className={cn('max-md:max-w-none max-md:flex-1 md:shrink-[999]', className)}
    />
  );
}
