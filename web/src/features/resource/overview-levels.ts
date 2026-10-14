// The four levels of Tải phân bổ as the dashboard draws them: the same tokens as the heatmap cells.
import type { OverviewLevels } from './overview-api';

export const OVERVIEW_LEVELS = ['bench', 'partial', 'full', 'over'] as const;
export type OverviewLevel = (typeof OVERVIEW_LEVELS)[number];

/** Fill of a segment of a bar or column. The Bench fill is nearly the canvas, so it carries a border. */
export const levelFill: Record<OverviewLevel, string> = {
  bench: 'border border-line bg-heat-bench',
  partial: 'bg-heat-partial',
  full: 'bg-heat-full',
  over: 'bg-heat-over',
};

export const levelTotal = (levels: OverviewLevels): number => levels.bench + levels.partial + levels.full + levels.over;
