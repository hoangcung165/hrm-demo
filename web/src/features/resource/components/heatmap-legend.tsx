// The legend under the heatmap: the four levels with the company's thresholds.
import { useTranslation } from 'react-i18next';
import { HeatLegend } from '@/components/ui/heat-legend';
import type { ResourceThresholds } from '../api';

export type HeatmapLegendProps = { thresholds: ResourceThresholds };

export function HeatmapLegend({ thresholds }: HeatmapLegendProps) {
  const { t } = useTranslation();
  const { benchPercent, nearFullPercent } = thresholds;
  return (
    <HeatLegend
      label={t('resources.legend.label')}
      items={[
        { percent: benchPercent - 1, label: t('resources.legend.bench', { percent: benchPercent }) },
        { percent: benchPercent, label: t('resources.legend.partial', { from: benchPercent, to: nearFullPercent - 1 }) },
        { percent: nearFullPercent, label: t('resources.legend.full', { from: nearFullPercent }) },
        { percent: 120, label: t('resources.legend.over') },
      ]}
      thresholds={{ bench: benchPercent, nearFull: nearFullPercent }}
    />
  );
}
