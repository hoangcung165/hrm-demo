// An Employee in a list: Avatar with initials, the name as the link to the profile, and a caption (the code).
import { Link } from 'react-router';
import { Avatar } from '@/components/ui/avatar';

export type EmployeePersonLinkProps = {
  id: string;
  fullName: string;
  /** Second line, in tabular figures: "NV00042", or "NV00042 · Kỹ sư phần mềm" in compact rows. */
  caption: string;
};

export function EmployeePersonLink({ id, fullName, caption }: EmployeePersonLinkProps) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={fullName} size="md" />
      <span className="flex min-w-0 flex-col">
        <Link to={`/employees/${id}`} className="truncate rounded-sm font-medium text-ink no-underline hover:text-brand-blue hover:underline">
          {fullName}
        </Link>
        <span className="truncate text-caption text-ink-muted tabular-nums">{caption}</span>
      </span>
    </span>
  );
}
