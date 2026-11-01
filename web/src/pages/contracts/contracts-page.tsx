// Hợp đồng (HRM-38, pattern P3 list): every labor contract of the company within the caller's Employee scope, read-only.
// The terms and the state only: salary is on the Employee's Hợp đồng tab, behind its own reveal.
import { useTranslation } from 'react-i18next';
import { ContractListSection } from './contract-list-section';

export function ContractsPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{t('contractList.title')}</h1>
        <p className="text-body-small text-ink-muted">{t('contractList.intro')}</p>
      </div>
      <ContractListSection />
    </div>
  );
}
