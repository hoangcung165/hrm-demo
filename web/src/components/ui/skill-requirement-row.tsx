// Library component "Skill requirement row" (`hrm-req`, HRM-16): one line of "Kỹ năng cần có" — the skill, the lowest
// level that counts ("Từ mức 3/5") and a button that drops the line. Grid `1fr · 160px · 44px`.
import { X } from 'lucide-react';
import { Button } from './button';
import { Select, type SelectOption } from './select';

export type SkillRequirementRowProps = {
  skillOptions: SelectOption[];
  skillId: string;
  onSkillChange: (skillId: string) => void;
  /** Names the skill control: "Kỹ năng 1". */
  skillLabel: string;
  skillPlaceholder: string;
  levelOptions: SelectOption[];
  level: string;
  onLevelChange: (level: string) => void;
  /** Names the level control: "Mức tối thiểu của React". */
  levelLabel: string;
  /** Names the remove button: "Bỏ kỹ năng React". Without it the row cannot be dropped (the only row). */
  removeLabel?: string;
  onRemove?: () => void;
};

export function SkillRequirementRow({ skillOptions, skillId, onSkillChange, skillLabel, skillPlaceholder, levelOptions, level, onLevelChange, levelLabel, removeLabel, onRemove }: SkillRequirementRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_160px_44px] items-center gap-2">
      <Select aria-label={skillLabel} value={skillId} onChange={onSkillChange} options={skillOptions} placeholder={skillPlaceholder} />
      <Select aria-label={levelLabel} value={level} onChange={onLevelChange} options={levelOptions} placeholder={levelLabel} />
      {removeLabel && onRemove ? (
        <Button variant="ghost" size="icon" aria-label={removeLabel} onClick={onRemove} className="text-ink-muted">
          <X aria-hidden="true" />
        </Button>
      ) : (
        <span />
      )}
    </div>
  );
}
