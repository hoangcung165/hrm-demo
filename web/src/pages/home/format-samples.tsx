import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime, formatMoney, formatNumber, formatPercent } from '@/lib/format';

export function FormatSamples() {
  const { t } = useTranslation();
  const rows = [
    [t('home.startDate'), formatDate('2026-10-02')],
    [t('home.updatedAt'), formatDateTime(new Date(2026, 8, 28, 9, 30))],
    [t('home.salary'), formatMoney(12500000)],
    [t('home.allocation'), formatPercent(112.5)],
    [t('home.workdays'), formatNumber(21.5)],
  ];

  return (
    <section className="rounded-md border border-line bg-surface">
      <h2 className="px-4 pt-4 text-heading">{t('home.sampleTitle')}</h2>
      <dl className="divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-3">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
