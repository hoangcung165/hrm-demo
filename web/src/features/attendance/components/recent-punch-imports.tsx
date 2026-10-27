// "Lần nhập gần đây" under the drop zone: the last three imports, so HR sees what was imported before choosing a file.
// Nothing is shown while loading, on a failure, or when there was no import yet: the panel is a courtesy.
import { useTranslation } from 'react-i18next';
import { formatCompanyDateTime, formatNumber } from '@/lib/format';
import { useRecentPunchImports } from '../import-api';

export function RecentPunchImports() {
  const { t } = useTranslation();
  const recent = useRecentPunchImports();
  if (!recent.data || recent.data.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-labelledby="recent-imports-title">
      <h3 id="recent-imports-title" className="text-body-strong">
        {t('attendanceImport.recent.title')}
      </h3>
      <table className="w-full text-left text-body-small">
        <caption className="sr-only">{t('attendanceImport.recent.caption')}</caption>
        <thead>
          <tr className="border-b border-line text-ink-muted">
            <th className="py-1 pr-3 font-medium">{t('attendanceImport.recent.file')}</th>
            <th className="w-32 py-1 text-right font-medium">{t('attendanceImport.recent.stored')}</th>
          </tr>
        </thead>
        <tbody>
          {recent.data.map((item) => (
            <tr key={item.id} className="border-b border-line last:border-0">
              <td className="py-2 pr-3">
                <span className="block font-medium [overflow-wrap:anywhere]">{item.fileName ?? t('attendanceImport.recent.noName')}</span>
                <span className="block text-caption text-ink-muted">
                  {formatCompanyDateTime(item.importedAt)}
                  {item.importedBy ? ` · ${item.importedBy}` : ''}
                </span>
              </td>
              <td className="py-2 text-right tabular-nums">{formatNumber(item.rowsStored)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
