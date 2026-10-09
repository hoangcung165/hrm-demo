// "Thao tác khác" at 390: the list actions that do not fit the header. Only "Xuất Excel"; import is desktop-only.
import { Download, Ellipsis, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Menu } from '@/components/ui/menu';

export type EmployeeMoreActionsProps = {
  busy: boolean;
  /** The list is loading, failed, or has no row: "Xuất Excel" is shown but cannot be chosen. */
  disabled: boolean;
  onExport: () => void;
};

export function EmployeeMoreActions({ busy, disabled, onExport }: EmployeeMoreActionsProps) {
  const { t } = useTranslation();
  return (
    <Menu
      trigger={
        <Button variant="secondary" size="icon" aria-label={t('employees.excel.more')} aria-busy={busy || undefined} className="size-11">
          {busy ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <Ellipsis aria-hidden="true" />}
        </Button>
      }
      items={[
        {
          id: 'export',
          label: t(busy ? 'employees.excel.exporting' : 'employees.excel.export'),
          icon: busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Download />,
          onSelect: onExport,
          disabled: busy || disabled,
        },
      ]}
    />
  );
}
