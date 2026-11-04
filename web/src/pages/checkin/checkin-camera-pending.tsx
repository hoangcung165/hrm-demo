// With the consent in force, the camera step comes next (HRM-39/FE-2, `#39 Chụp ảnh chấm công (390)`). Until it is
// built this says the consent is saved and leads back to Tổng quan; FE-2 replaces it.
import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { cn } from '@/lib/utils';

export function CheckinCameraPending() {
  const { t } = useTranslation();
  return (
    <Card bare>
      <StateBlock
        variant="plain"
        icon={<Camera />}
        title={t('mobileCheckin.cameraPending.title')}
        description={t('mobileCheckin.cameraPending.text')}
        actions={<Link to="/" className={cn(buttonVariants({ variant: 'secondary' }))}>{t('mobileCheckin.cameraPending.back')}</Link>}
      />
    </Card>
  );
}
