// "Vai trò và quyền" tab: the role and permission matrix with its loading and error states, the legend and
// what each data scope means. Read-only until HRM-04/FE-4b adds editing.
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { MatrixLegend } from '@/components/ui/matrix-legend';
import type { DataScope } from '@/features/auth/account';
import { useRoleMatrix } from '@/features/role/api';
import { RoleMatrix } from '@/features/role/components/role-matrix';
import { ApiError } from '@/lib/api';

export type RoleMatrixSectionProps = {
  /** The API answered 403: the Account lost ACCOUNT_LIST after signing in. */
  onDenied: () => void;
};

// Widest first, as the matrix names them.
const SCOPES: DataScope[] = ['COMPANY', 'ORG_UNIT', 'SELF'];

export function RoleMatrixSection({ onDenied }: RoleMatrixSectionProps) {
  const { t } = useTranslation();
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
  return (
    <div className="flex flex-col gap-4">
      <RoleMatrix matrix={matrix.data} />
      {matrix.data ? (
        <>
          <MatrixLegend yesLabel={t('roles.granted')} noLabel={t('roles.notGranted')} />
          {/* 14/20 as the legend above it. */}
          <ul className="flex flex-col gap-1 text-[14px] leading-5 text-ink-muted">
            {scopes.map((scope) => (
              <li key={scope}>
                <span className="font-medium text-ink">{t(`accounts.scope.${scope}`)}:</span> {t(`roles.scopeHelp.${scope}`)}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
