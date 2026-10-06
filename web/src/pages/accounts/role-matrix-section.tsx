// "Vai trò và quyền" tab: the role and permission matrix with its loading and error states, the legend and
// what each data scope means. Editable with ACCOUNT_EDIT (boxes and the Save bar), read-only without.
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { MatrixLegend } from '@/components/ui/matrix-legend';
import type { DataScope } from '@/features/auth/account';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useRoleMatrix } from '@/features/role/api';
import { RoleMatrix } from '@/features/role/components/role-matrix';
import { RoleMatrixEditor } from '@/features/role/components/role-matrix-editor';
import { ApiError } from '@/lib/api';

export type RoleMatrixSectionProps = {
  /** The API answered 403: the Account lost ACCOUNT_LIST after signing in. */
  onDenied: () => void;
};

// Widest first, as the matrix names them.
const SCOPES: DataScope[] = ['COMPANY', 'ORG_UNIT', 'SELF'];

export function RoleMatrixSection({ onDenied }: RoleMatrixSectionProps) {
  const { t } = useTranslation();
  const canEdit = useCurrentAccount().permissions.includes('ACCOUNT_EDIT');
  const matrix = useRoleMatrix();
  const denied = matrix.error instanceof ApiError && matrix.error.status === 403;
  useEffect(() => {
    if (denied) onDenied();
    // `onDenied` is new on every render.
  }, [denied]);

  if (matrix.isError) {
    return denied ? null : (
      <Card bare>
        <ErrorState title={t('roles.loadError')} onRetry={() => void matrix.refetch()} />
      </Card>
    );
  }
  const scopes = SCOPES.filter((scope) => matrix.data?.roles.some((rule) => rule.dataScope === scope));
  const scopeHelp = (
    <ul className="flex flex-col gap-1 text-body-small text-ink-muted">
      {scopes.map((scope) => (
        <li key={scope}>
          <span className="font-medium text-ink">{t(`accounts.scope.${scope}`)}:</span> {t(`roles.scopeHelp.${scope}`)}
        </li>
      ))}
    </ul>
  );
  const intro = canEdit ? 'edit' : 'view';
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="info" title={t(`roles.intro.${intro}.title`)}>
        {t(`roles.intro.${intro}.text`)}
      </Alert>
      {matrix.data && canEdit ? (
        <RoleMatrixEditor matrix={matrix.data}>{scopeHelp}</RoleMatrixEditor>
      ) : (
        <>
          <RoleMatrix matrix={matrix.data} />
          {matrix.data ? <MatrixLegend yesLabel={t('roles.granted')} noLabel={t('roles.notGranted')} /> : null}
          {matrix.data ? scopeHelp : null}
        </>
      )}
    </div>
  );
}
