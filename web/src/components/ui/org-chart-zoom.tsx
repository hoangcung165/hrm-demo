// Zoom controls of the library component "Org chart": `secondary sm` icon-only Buttons with the percentage between
// them, and "Vừa màn hình". They are the keyboard alternative to Ctrl + wheel.
import { Maximize, Minus, Plus } from 'lucide-react';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from './button';

export type OrgChartZoomLabels = { group: string; zoomOut: string; zoomIn: string; fit: string };

export type OrgChartZoomProps = {
  /** Percentage, e.g. 100. */
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  labels: OrgChartZoomLabels;
  className?: string;
};

// 44px touch targets below md.
const ICON = 'max-md:size-11';

export function OrgChartZoom({ zoom, onZoomIn, onZoomOut, onFit, canZoomIn, canZoomOut, labels, className }: OrgChartZoomProps) {
  return (
    <div role="group" aria-label={labels.group} className={cn('flex items-center gap-2', className)}>
      <Button variant="secondary" size="icon-sm" aria-label={labels.zoomOut} disabled={!canZoomOut} onClick={onZoomOut} className={ICON}>
        <Minus aria-hidden="true" />
      </Button>
      {/* 14px is the design system's size for this number; there is no text token for it. */}
      <span aria-live="polite" className="w-11 text-center text-[14px] font-medium tabular-nums">
        {formatPercent(zoom)}
      </span>
      <Button variant="secondary" size="icon-sm" aria-label={labels.zoomIn} disabled={!canZoomIn} onClick={onZoomIn} className={ICON}>
        <Plus aria-hidden="true" />
      </Button>
      <Button variant="secondary" size="sm" onClick={onFit} className="max-md:h-11 [&_svg]:size-4">
        <Maximize aria-hidden="true" />
        {labels.fit}
      </Button>
    </div>
  );
}
