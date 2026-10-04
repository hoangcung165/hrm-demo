// Error state (pattern P10): says what could not be loaded and offers a retry.
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';
import { StateBlock } from './state-block';

export type ErrorStateProps = {
  /** What failed, with its object: "Không tải được danh sách nhân viên". */
  title: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({ title, description, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <StateBlock
      variant="error"
      title={title}
      description={description ?? t('state.errorHint')}
      className={className}
      actions={
        onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw aria-hidden="true" className="!size-4" />
            {t('state.retry')}
          </Button>
        ) : undefined
      }
    />
  );
}
