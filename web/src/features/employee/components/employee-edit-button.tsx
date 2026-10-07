// "Sửa" next to a profile card's heading (Button secondary sm, pencil): opens the card for editing in place.
import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export type EmployeeEditButtonProps = {
  /** The card, in lower case after "Sửa": "thông tin cá nhân". */
  part: string;
  onEdit?: () => void;
};

export function EmployeeEditButton({ part, onEdit }: EmployeeEditButtonProps) {
  const { t } = useTranslation();
  return (
    <Button variant="secondary" size="sm" aria-label={t('employees.profile.editPart', { part })} disabled={!onEdit} onClick={onEdit} className="max-md:h-11 [&_svg]:size-4">
      <Pencil aria-hidden="true" />
      {t('employees.profile.edit')}
    </Button>
  );
}
