import { useTranslation } from 'react-i18next';
import { greetingName, greetingPeriod } from '@/features/dashboard/greeting';
import { companyHour, companyToday } from '@/lib/company-time';
import { formatDate } from '@/lib/format';

export function DashboardGreeting({ fullName }: { fullName: string }) {
  const { t } = useTranslation();
  const period = greetingPeriod(companyHour());
  return (
    <div className="flex flex-wrap items-baseline gap-x-3">
      <h1 className="text-title">{t(`dashboard.greeting.${period}`, { name: greetingName(fullName) })}</h1>
      <span className="text-ink-muted">{formatDate(companyToday())}</span>
    </div>
  );
}
