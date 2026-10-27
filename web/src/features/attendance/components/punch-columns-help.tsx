// The side panel of step 1: which columns the file needs, three example rows, and the sample file (built in the browser).
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { saveTemplate } from '../import-template';

const EXAMPLE = [
  ['NV00031', '13/10/2026 08:17', 'Cổng chính'],
  ['NV00034', '14/10/2026 06:02', 'Cổng chính'],
  ['NV00022', '12/10/2026 17:03', 'Cổng sau'],
] as const;

export function PunchColumnsHelp() {
  const { t } = useTranslation();
  return (
    <aside className="flex flex-col gap-3 rounded-md border border-line bg-surface-muted p-4" aria-labelledby="punch-columns-title">
      <h3 id="punch-columns-title" className="text-body-strong">
        {t('attendanceImport.columns.title')}
      </h3>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        <li>{t('attendanceImport.columns.code')}</li>
        <li>{t('attendanceImport.columns.time')}</li>
        <li>{t('attendanceImport.columns.device')}</li>
      </ul>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-body-small whitespace-nowrap">
          <caption className="sr-only">{t('attendanceImport.columns.exampleCaption')}</caption>
          <thead>
            <tr className="border-b border-line text-ink-muted">
              <th className="py-1 pr-3 font-medium">{t('attendanceImport.columns.headCode')}</th>
              <th className="py-1 pr-3 font-medium">{t('attendanceImport.columns.headTime')}</th>
              <th className="py-1 font-medium">{t('attendanceImport.columns.headDevice')}</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLE.map(([code, time, device]) => (
              <tr key={code} className="border-b border-line last:border-0">
                <td className="py-1 pr-3 tabular-nums">{code}</td>
                <td className="py-1 pr-3 tabular-nums">{time}</td>
                <td className="py-1">{device}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-ink-muted">{t('attendanceImport.columns.note')}</p>
      <Button variant="secondary" size="sm" className="self-start" onClick={saveTemplate}>
        <Download aria-hidden="true" />
        {t('attendanceImport.columns.template')}
      </Button>
    </aside>
  );
}
