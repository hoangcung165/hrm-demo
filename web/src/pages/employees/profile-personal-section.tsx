// Tab "Cá nhân": "Thông tin cá nhân" and "Giấy tờ định danh", side by side from 1024px, each edited in place on its
// own; while one is open the other has no "Sửa". On their own profile, an Employee who cannot edit it asks for a
// change instead (HRM-12): "Đề nghị cập nhật", or the request still open.
import type { EmployeeProfile } from '@/features/employee/api';
import { EmployeeIdentityCard } from '@/features/employee/components/employee-identity-card';
import { ProfileNationalityCard } from '@/features/employee/components/profile-nationality-card';
import { EmployeeIdentityEditCard } from '@/features/employee/components/employee-identity-edit-card';
import { EmployeePersonalCard } from '@/features/employee/components/employee-personal-card';
import { EmployeePersonalEditCard } from '@/features/employee/components/employee-personal-edit-card';
import { useProfileEdit } from '@/features/employee/profile-edit-context';
import { useProfileUpdateEntry } from './profile-update-entry';

export type ProfilePersonalSectionProps = {
  employee: EmployeeProfile;
  own: boolean;
  canEdit: boolean;
  canEditIdentity: boolean;
};

export function ProfilePersonalSection({ employee, own, canEdit, canEditIdentity }: ProfilePersonalSectionProps) {
  const { editing, start, setDirty } = useProfileEdit();
  const request = useProfileUpdateEntry(employee, own && !canEdit);
  return (
    <>
      {request.status}
      {request.dialog}
      <div className="grid items-start gap-4 md:gap-6 lg:grid-cols-2">
        {editing === 'personal' ? (
          <EmployeePersonalEditCard employee={employee} />
        ) : (
          <EmployeePersonalCard employee={employee} editable={canEdit} locked={editing !== null} onEdit={() => start('personal')} aside={request.button} />
        )}
        {editing === 'identity' ? (
          <EmployeeIdentityEditCard employee={employee} />
        ) : (
          <EmployeeIdentityCard identity={employee.identity} own={own} editable={canEditIdentity} locked={editing !== null} onEdit={() => start('identity')} />
        )}
      </div>
      <ProfileNationalityCard employeeId={employee.id} canEdit={canEdit && editing === null}
        onDirtyChange={setDirty} />
    </>
  );
}
