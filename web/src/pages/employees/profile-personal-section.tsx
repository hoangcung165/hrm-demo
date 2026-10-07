// Tab "Cá nhân": "Thông tin cá nhân" and "Giấy tờ định danh", side by side from 1024px.
import type { EmployeeProfile } from '@/features/employee/api';
import { EmployeeIdentityCard } from '@/features/employee/components/employee-identity-card';
import { EmployeePersonalCard } from '@/features/employee/components/employee-personal-card';

export type ProfilePersonalSectionProps = {
  employee: EmployeeProfile;
  own: boolean;
  canEdit: boolean;
  canEditIdentity: boolean;
};

export function ProfilePersonalSection({ employee, own, canEdit, canEditIdentity }: ProfilePersonalSectionProps) {
  return (
    <div className="grid items-start gap-4 md:gap-6 lg:grid-cols-2">
      <EmployeePersonalCard employee={employee} editable={canEdit} />
      <EmployeeIdentityCard identity={employee.identity} own={own} editable={canEditIdentity} />
    </div>
  );
}
