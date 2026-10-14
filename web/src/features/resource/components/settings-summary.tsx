// Under the fields of the thresholds dialog: the colour scale the fields would give, and who saved the thresholds last.
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/lib/format';
import type { ResourceThresholds } from '../api';
import type { ResourceSettings } from '../settings-api';
import { HeatmapLegend } from './heatmap-legend';

export type SettingsSummaryProps = { preview: ResourceThresholds; settings: ResourceSettings };

export function SettingsSummary({ preview, settings }: SettingsSummaryProps) {
  const { t } = useTranslation();
  const { customized, updatedAt, updatedByName } = settings;
  const last =
    !customized || !updatedAt
      ? t('resources.settings.lastDefaults')
      : updatedByName
        ? t('resources.settings.lastBy', { name: updatedByName, when: formatDateTime(updatedAt) })
        : t('resources.settings.lastAt', { when: formatDateTime(updatedAt) });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-md bg-surface-muted p-4">
        <p className="text-body-small font-medium">{t('resources.settings.preview')}</p>
        <HeatmapLegend thresholds={preview} />
      </div>
      <p className="text-caption text-ink-muted">{last}</p>
    </div>
  );
}
