// Library components "Match row", "Match group" (heading and list) and "Match list" (`hrm-match`, `hrm-match-group`, HRM-16): the
// result of Tìm người. A row is the person, the free figure and the action on the first line, the skill chips under
// them, and the load strip. Grid `1fr · 136px · 96px`; chips and strip span the first two columns.
import type { ReactNode } from 'react';

export type MatchRowProps = {
  person: ReactNode;
  free: ReactNode;
  /** The row's action ("Phân bổ"). */
  action?: ReactNode;
  /** Skill chips and the leave badge. */
  skills: ReactNode;
  strip?: ReactNode;
};

export function MatchRow({ person, free, action, skills, strip }: MatchRowProps) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_136px_96px] items-start gap-x-4 gap-y-3 border-b border-line py-4">
      <div className="min-w-0">{person}</div>
      <div>{free}</div>
      <div className="col-start-3 row-start-1 justify-self-end">{action}</div>
      <div className="col-span-2 flex flex-wrap gap-2">{skills}</div>
      {strip ? <div className="col-span-2">{strip}</div> : null}
    </li>
  );
}

export type MatchListProps = {
  /** Names the list: "Người khớp đủ 2 kỹ năng". */
  label: string;
  children: ReactNode;
};

export function MatchList({ label, children }: MatchListProps) {
  return (
    <ul aria-label={label} className="m-0 list-none border-t border-line p-0">
      {children}
    </ul>
  );
}

export type MatchGroupProps = {
  /** "Khớp đủ 2 kỹ năng" */
  title: string;
  count: number;
  /** Names the list: "Người khớp đủ 2 kỹ năng". */
  listLabel: string;
  children: ReactNode;
};

export function MatchGroup({ title, count, listLabel, children }: MatchGroupProps) {
  return (
    <section>
      <h4 className="flex items-baseline gap-2 pt-3 pb-1 text-[12px] leading-4 font-semibold tracking-[0.02em] text-ink-muted uppercase">
        {title}{' '}
        <span className="tabular-nums">{count}</span>
      </h4>
      <MatchList label={listLabel}>{children}</MatchList>
    </section>
  );
}
