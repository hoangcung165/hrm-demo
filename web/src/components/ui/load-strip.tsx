// Library component "Load strip" (HRM-16): the Tải phân bổ of each month in a range as a row of small heat cells,
// each under its month ("11/26"). Colour is never the only cue: every cell prints its percent and reads out its month.
import { HeatCell, type HeatThresholds } from './heat-cell';

export type LoadStripMonth = { key: string; label: string; percent: number; ariaLabel: string };

export type LoadStripProps = {
  months: LoadStripMonth[];
  /** Names the strip: "Tải phân bổ theo tháng". */
  label: string;
  thresholds?: HeatThresholds;
};

export function LoadStrip({ months, label, thresholds }: LoadStripProps) {
  return (
    <ul aria-label={label} className="m-0 flex list-none items-end gap-1 p-0">
      {months.map((month) => (
        <li key={month.key} className="flex flex-col items-center gap-0.5 text-[12px] leading-4 text-ink-muted tabular-nums">
          <span aria-hidden="true">{month.label}</span>
          <HeatCell percent={month.percent} label={month.ariaLabel} size="sm" thresholds={thresholds} />
        </li>
      ))}
    </ul>
  );
}
