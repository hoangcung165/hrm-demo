import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AuthHeading } from '@/features/auth/components/auth-heading';
import { BackToLogin } from '@/features/auth/components/back-to-login';

/** Shown when the reset link has no token, or the backend says it is unknown, expired or already used. */
export function LinkExpiredPanel() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={t('auth.expired.title')}
        mark={
          <span aria-hidden="true" className="mb-4 grid size-12 place-items-center rounded-full border border-line bg-surface-muted text-danger">
            <TriangleAlert className="size-5 stroke-[1.5]" />
          </span>
        }
      >
        {t('auth.expired.text')}
      </AuthHeading>
      <Link
        to="/forgot-password"
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-brand-blue px-4 font-medium text-on-brand hover:bg-brand-blue-deep"
      >
        {t('auth.expired.action')}
      </Link>
      <BackToLogin />
    </div>
  );
}
