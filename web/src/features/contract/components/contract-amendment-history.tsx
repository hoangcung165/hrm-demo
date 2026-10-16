import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { contractAmendmentsKey, listContractAmendments } from '../write';

export function ContractAmendmentHistory({ employeeId, contractId }: {
  employeeId: string; contractId: string;
}) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: contractAmendmentsKey(employeeId, contractId),
    queryFn: () => listContractAmendments(employeeId, contractId),
  });
  const key = 'employees.profile.contracts.manage';
  if (query.isPending) return <p role="status" className="text-caption text-ink-muted">{t(`${key}.loadingAmendments`)}</p>;
  if (query.isError) return <div className="flex items-center gap-3">
    <p role="alert" className="text-caption text-danger">{t(`${key}.amendmentsFailed`)}</p>
    <button type="button" className="text-link" onClick={() => void query.refetch()}>{t(`${key}.retry`)}</button>
  </div>;
  if (!query.data?.length) return null;
  return <section className="flex flex-col gap-2 border-t border-line pt-4"
    aria-label={t(`${key}.amendmentsTitle`)}>
    <h3 className="text-body-strong">{t(`${key}.amendmentsTitle`)}</h3>
    <ol className="flex flex-col gap-2">
      {query.data.map(amendment => (
        <li key={amendment.id} className="rounded-sm bg-surface-muted px-3 py-2">
          <span className="font-medium">{amendment.amendmentNumber}</span>
          <span className="ml-2 text-caption text-ink-muted">{formatDate(amendment.effectiveOn)}</span>
          <p className="text-caption">{amendment.description}</p>
        </li>
      ))}
    </ol>
  </section>;
}
