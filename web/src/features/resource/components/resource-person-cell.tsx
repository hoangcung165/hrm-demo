// The person of a Bench or Sắp hết dự án row: the name and "code · unit", a link to the profile with EMPLOYEE_VIEW.
import { Link } from 'react-router';
import { Person } from '@/components/ui/person';
import { useCurrentAccount } from '@/features/auth/account-context';
import type { EmployeeCard } from '@/features/project/api';

export function ResourcePersonCell({ employee }: { employee: EmployeeCard }) {
  const { permissions } = useCurrentAccount();
  const person = <Person name={employee.fullName} caption={[employee.code, employee.orgUnitName].filter(Boolean).join(' · ')} />;
  if (!permissions.includes('EMPLOYEE_VIEW')) return person;
  return (
    <Link to={`/employees/${employee.id}`} className="block rounded-sm hover:text-brand-blue focus-visible:shadow-focus-ring">
      {person}
    </Link>
  );
}
