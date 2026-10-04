// Loading state of the Company page: both cards, each field a label bar over a control block.
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { FormGrid } from '@/components/ui/form-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type FieldSkeletonProps = { label: string; tall?: boolean; className?: string };

function FieldSkeleton({ label, tall, className }: FieldSkeletonProps) {
  return (
    <span className={cn('flex flex-col gap-2', className)}>
      <Skeleton className={label} />
      <Skeleton shape="control" className={tall ? 'h-22' : undefined} />
    </span>
  );
}

export function CompanySkeleton() {
  const { t } = useTranslation();
  return (
    <>
      <Card busy label={t('company.loading')}>
        <FormGrid>
          <FieldSkeleton label="w-24" className="md:col-span-2" />
          <FieldSkeleton label="w-22" />
          <FieldSkeleton label="w-16" tall className="md:col-span-2" />
          <FieldSkeleton label="w-20" />
          <FieldSkeleton label="w-20" />
        </FormGrid>
      </Card>
      <Card busy label={t('company.logo.loading')}>
        <div className="flex items-start gap-4">
          <Skeleton className="size-18 shrink-0 rounded-md md:size-24" />
          <span className="flex flex-1 flex-col gap-2">
            <Skeleton shape="control" className="w-36" />
            <Skeleton className="w-[70%]" />
          </span>
        </div>
      </Card>
    </>
  );
}
