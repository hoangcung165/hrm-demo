// Library component "Skill match chip" (`hrm-skill`, HRM-16): one required skill against what a person has. Three states,
// each told by words and an icon as well as colour: `met` (level at or above the minimum), `below` (has it, lower) and
// `missing` (does not have it, dashed).
import { ArrowDown, Check, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SkillChipState = 'met' | 'below' | 'missing';

export type SkillChipProps = {
  state: SkillChipState;
  /** The skill: "React". For `missing` it is already the whole text: "Chưa có React". */
  name: string;
  /** The level, after the name: "Mức 4/5", or "Mức 2/5, cần 3" for `below`. */
  detail?: string;
  className?: string;
};

const STYLE: Record<SkillChipState, string> = {
  met: 'border-transparent bg-brand-teal-soft text-teal-text',
  below: 'border-transparent bg-warning-soft text-warning',
  missing: 'border-dashed border-ink-muted bg-surface text-ink-muted',
};
const ICON = { met: Check, below: ArrowDown, missing: CircleDashed } as const;

export function SkillChip({ state, name, detail, className }: SkillChipProps) {
  const Icon = ICON[state];
  return (
    <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[13px] leading-[18px] font-medium whitespace-nowrap', STYLE[state], className)}>
      <Icon aria-hidden="true" className="size-3.5 stroke-2" />
      {name}
      {detail ? (
        <>
          {' '}
          <span className="font-normal tabular-nums">{detail}</span>
        </>
      ) : null}
    </span>
  );
}
