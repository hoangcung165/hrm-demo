import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { FreeFigure } from './free-figure';
import { LoadStrip } from './load-strip';
import { MatchGroup, MatchRow } from './match-row';
import { SkillChip } from './skill-chip';
import { SkillRequirementRow } from './skill-requirement-row';

beforeEach(async () => {
  await i18n.changeLanguage('vi');
});

describe('SkillChip', () => {
  it('says each state in words as well as colour', () => {
    render(
      <>
        <SkillChip state="met" name="React" detail="Mức 4/5" />
        <SkillChip state="below" name="TypeScript" detail="Mức 2/5, cần 3" />
        <SkillChip state="missing" name="Chưa có React" />
      </>,
    );
    expect(screen.getByText('React')).toHaveTextContent('React Mức 4/5');
    expect(screen.getByText('TypeScript')).toHaveTextContent('Mức 2/5, cần 3');
    expect(screen.getByText('Chưa có React').className).toContain('border-dashed');
  });
});

describe('FreeFigure', () => {
  it('reads the percent with its label, and a plain note is not read twice', () => {
    render(<FreeFigure percent={70} label="70% còn trống" note="còn trống" />);
    expect(screen.getByText('70% còn trống')).toHaveClass('sr-only');
    expect(screen.getByText('còn trống')).toHaveAttribute('aria-hidden', 'true');
  });

  it('reads a note that is news', () => {
    render(<FreeFigure percent={20} label="20% còn trống" note={<span>Thiếu 30%</span>} />);
    expect(screen.getByText('Thiếu 30%').parentElement).not.toHaveAttribute('aria-hidden');
  });
});

describe('LoadStrip', () => {
  it('prints every month with its percent and reads it out', () => {
    render(
      <LoadStrip
        label="Tải phân bổ theo tháng"
        months={[
          { key: '2026-11', label: '11/26', percent: 110, ariaLabel: 'Tháng 11/2026: Tải phân bổ 110%, quá tải' },
          { key: '2026-12', label: '12/26', percent: 0, ariaLabel: 'Tháng 12/2026: Tải phân bổ 0%' },
        ]}
      />,
    );
    const strip = screen.getByRole('list', { name: 'Tải phân bổ theo tháng' });
    expect(within(strip).getAllByRole('img')).toHaveLength(2);
    expect(within(strip).getByRole('img', { name: 'Tháng 11/2026: Tải phân bổ 110%, quá tải' })).toHaveTextContent('110%');
    expect(strip).toHaveTextContent('11/26');
  });
});

describe('MatchRow and MatchGroup', () => {
  it('lays out the person, the free figure, the skills and the strip, under a titled group', () => {
    render(
      <MatchGroup title="Khớp đủ 2 kỹ năng" count={1} listLabel="Người khớp đủ 2 kỹ năng">
        <MatchRow person={<span>Phan Khánh Duy</span>} free={<span>70%</span>} skills={<span>React</span>} strip={<span>strip</span>} action={<button type="button">Phân bổ</button>} />
      </MatchGroup>,
    );
    expect(screen.getByRole('heading', { name: 'Khớp đủ 2 kỹ năng 1' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Người khớp đủ 2 kỹ năng' });
    expect(within(list).getByText('Phan Khánh Duy')).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Phân bổ' })).toBeInTheDocument();
  });
});

describe('SkillRequirementRow', () => {
  const options = [{ value: 'react', label: 'React' }];
  const levels = [{ value: '3', label: 'Từ mức 3/5' }];

  it('drops the row with its button, named after the skill', async () => {
    const onRemove = vi.fn();
    render(
      <SkillRequirementRow skillOptions={options} skillId="react" onSkillChange={() => {}} skillLabel="Kỹ năng 1" skillPlaceholder="Chọn kỹ năng" levelOptions={levels} level="3" onLevelChange={() => {}} levelLabel="Mức tối thiểu của React" removeLabel="Bỏ kỹ năng React" onRemove={onRemove} />,
    );
    expect(screen.getByRole('combobox', { name: 'Kỹ năng 1' })).toHaveTextContent('React');
    expect(screen.getByRole('combobox', { name: 'Mức tối thiểu của React' })).toHaveTextContent('Từ mức 3/5');
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ kỹ năng React' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('has no remove button until a skill is chosen', () => {
    render(<SkillRequirementRow skillOptions={options} skillId="" onSkillChange={() => {}} skillLabel="Kỹ năng 1" skillPlaceholder="Chọn kỹ năng" levelOptions={levels} level="3" onLevelChange={() => {}} levelLabel="Mức tối thiểu" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
