// A project in a list: its name as the link to the project, and "DA-031 · Bệnh viện Đa khoa Tâm An" under it
// ("Dự án nội bộ" when there is no client). Compact rows put the PM there instead of the client.
import { Link } from 'react-router';

export type ProjectNameLinkProps = {
  id: string;
  name: string;
  /** Second line, e.g. "DA-031 · Bệnh viện Đa khoa Tâm An". */
  caption: string;
};

export function ProjectNameLink({ id, name, caption }: ProjectNameLinkProps) {
  return (
    <span className="flex min-w-0 flex-col">
      <Link to={`/projects/${id}`} className="truncate rounded-sm font-medium text-ink no-underline hover:text-brand-blue hover:underline">
        {name}
      </Link>
      <span className="truncate text-caption font-normal text-ink-muted tabular-nums">{caption}</span>
    </span>
  );
}
