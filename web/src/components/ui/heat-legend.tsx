// Legend of heatmap cells (`hrm-legend`): a small cell per level with what it means, under the table.
import { cn } from '@/lib/utils';
import { HeatCell } from './heat-cell';

export type HeatLegendItem = { percent: number; label: string };

export type HeatLegendProps = {
  /** Accessible name of the list: "Chú giải Tải phân bổ". */
  label: string;
  items: HeatLegendItem[];
  className?: string;
};

export function HeatLegend({ label, items, className }: HeatLegendProps) {
  return (
    <ul aria-label={label} className={cn('flex flex-wrap gap-x-6 gap-y-2 text-body-small text-ink-muted', className)}>
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-2">
          <HeatCell percent={item.percent} label={item.label} size="sm" />
          <span aria-hidden="true">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
