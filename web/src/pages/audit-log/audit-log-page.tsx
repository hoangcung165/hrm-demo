// Audit log (HRM-13): who changed a sensitive record, when, and its values before → after. Needs AUDIT_VIEW (Admin and
// Giám đốc by default); without it the page says so and asks the API nothing. Read only: there is nothing to edit or
// delete anywhere on it. Search, filters and page live in the URL.
import { useTranslation } from 'react-i18next';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useAuditFilters } from '@/features/audit/use-audit-filters';
import { AuditLogDenied } from './audit-log-denied';
import { AuditLogSection } from './audit-log-section';

export function AuditLogPage() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const canView = permissions.includes('AUDIT_VIEW');
  const filters = useAuditFilters();
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{t('audit.title')}</h1>
        <p className="text-ink-muted">{t('audit.intro')}</p>
      </div>
      {canView ? <AuditLogSection filters={filters} /> : <AuditLogDenied />}
    </div>
  );
}
