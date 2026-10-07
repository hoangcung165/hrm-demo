// Tab "Cá nhân": "Thông tin cá nhân" and "Giấy tờ định danh", side by side from 1024px, each edited in place on its
// own; while one is open the other has no "Sửa".
import type { EmployeeProfile } from '@/features/employee/api';
import { EmployeeIdentityCard } from '@/features/employee/components/employee-identity-card';
import { EmployeeIdentityEditCard } from '@/features/employee/components/employee-identity-edit-card';
import { EmployeePersonalCard } from '@/features/employee/components/employee-personal-card';
import { EmployeePersonalEditCard } from '@/features/employee/components/employee-personal-edit-card';
import { useProfileEdit } from '@/features/employee/profile-edit-context';

export type ProfilePersonalSectionProps = {
  employee: EmployeeProfile;
  own: boolean;
  canEdit: boolean;
  canEditIdentity: boolean;
};

export function ProfilePersonalSection({ employee, own, canEdit, canEditIdentity }: ProfilePersonalSectionProps) {
  const { editing, start } = useProfileEdit();
  return (
    <div className="grid items-start gap-4 md:gap-6 lg:grid-cols-2">
      {editing === 'personal' ? (
        <EmployeePersonalEditCard employee={employee} />
      ) : (
        <EmployeePersonalCard employee={employee} editable={canEdit} locked={editing !== null} onEdit={() => start('personal')} />
      )}
      {editing === 'identity' ? (
        <EmployeeIdentityEditCard employee={employee} />
      ) : (
        <EmployeeIdentityCard identity={employee.identity} own={own} editable={canEditIdentity} locked={editing !== null} onEdit={() => start('identity')} />
      )}
    </div>
  );
}
