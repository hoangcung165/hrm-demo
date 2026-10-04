// Card "Logo": saves on its own (upload, replace, remove), not through the form's primary button.
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ImageUpload } from '@/components/ui/image-upload';
import type { Company } from '../api';
import { LOGO_ACCEPT } from '../logo-rules';
import { useCompanyLogo } from '../use-company-logo';

export type CompanyLogoCardProps = { company: Company };

export function CompanyLogoCard({ company }: CompanyLogoCardProps) {
  const { t } = useTranslation();
  const logo = useCompanyLogo();
  const uploadButton = useRef<HTMLButtonElement>(null);
  // After a removal the "remove" button that opened the dialog is gone: focus goes to the upload button instead.
  return (
    <Card title={t('company.logo.title')} description={t('company.logo.description')}>
      <ImageUpload
        ref={uploadButton}
        src={company.logoUrl}
        alt={t('company.logo.alt', { name: company.name })}
        accept={LOGO_ACCEPT}
        uploadLabel={t('company.logo.upload')}
        replaceLabel={t('company.logo.replace')}
        removeLabel={t('company.logo.remove')}
        helper={logo.uploading ? t('company.logo.uploading') : t('company.logo.helper')}
        dropHint={t('company.logo.dropHint')}
        error={logo.error}
        uploading={logo.uploading}
        onSelect={logo.select}
        onRemove={logo.askRemove}
      />
      <ConfirmDialog
        open={logo.confirmingRemove}
        title={t('company.logo.confirmTitle')}
        description={t('company.logo.confirmText')}
        confirmLabel={t('company.logo.confirmButton')}
        pending={logo.removing}
        onConfirm={logo.confirmRemove}
        onCancel={logo.cancelRemove}
        fallbackFocus={uploadButton}
      />
    </Card>
  );
}
