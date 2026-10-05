// The org structure could not be loaded: shared by the "Cây đơn vị" and "Sơ đồ tổ chức" tabs.
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { StateBlock } from '@/components/ui/state-block';
import { ApiError } from '@/lib/api';

export type OrgLoadErrorProps = { error: unknown; onRetry: () => void };

export function OrgLoadError({ error, onRetry }: OrgLoadErrorProps) {
  const { t } = useTranslation();
  // The Account lost ORG_VIEW after signing in: say so, without the retry and network hint of a failed load.
  const denied = error instanceof ApiError && error.status === 403;
  return (
    <Card bare>
      {denied ? (
        <StateBlock variant="denied" title={t('org.denied.title')} description={t('org.denied.text')} />
      ) : (
        <ErrorState title={t('org.loadError')} onRetry={onRetry} />
      )}
    </Card>
  );
}
