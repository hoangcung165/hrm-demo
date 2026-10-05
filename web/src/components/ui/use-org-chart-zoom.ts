// Zoom of the library component "Org chart": 50% to 150% in steps of 10, fit to the viewport, and Ctrl + wheel.
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { anchoredScroll, type ScrollAxis } from './org-chart-scroll';

export const ZOOM_MIN = 50;
export const ZOOM_MAX = 150;
export const ZOOM_STEP = 10;
/** "Vừa màn hình" may go under the step range to show a wide chart whole on a phone, but never enlarges past 100%. */
const FIT_MIN = 20;
/** Wheel distance per zoom step; a trackpad sends many small events. */
const WHEEL_PER_STEP = 60;

const clamp = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
/** The next multiple of 10 above or below, also from the odd percentage a fit leaves. */
export const zoomedIn = (zoom: number) => clamp(Math.floor(zoom / ZOOM_STEP) * ZOOM_STEP + ZOOM_STEP);
export const zoomedOut = (zoom: number) => clamp(Math.ceil(zoom / ZOOM_STEP) * ZOOM_STEP - ZOOM_STEP);

type Size = { width: number; height: number };

/** The largest whole percentage at which `chart` (its size at 100%) fits in `space`. */
export function fitZoom(space: Size, chart: Size): number {
  if (chart.width <= 0 || chart.height <= 0 || space.width <= 0 || space.height <= 0) return 100;
  const ratio = Math.min(space.width / chart.width, space.height / chart.height);
  return Math.min(100, Math.max(FIT_MIN, Math.floor(ratio * 100)));
}

/** Where the viewport was before a zoom step, so the step can keep its centre in place. */
type Anchor = { zoom: number; x: ScrollAxis; y: ScrollAxis };

/** Pass `zoom` and `viewportRef` to `OrgChart`; the rest drives `OrgChartZoom`. */
export function useOrgChartZoom() {
  const [zoom, setZoom] = useState(100);
  const viewport = useRef<HTMLDivElement | null>(null);
  const current = useRef(zoom);
  const anchor = useRef<Anchor | null>(null);

  // A zoom step (buttons, Ctrl + wheel) keeps the point at the centre of the viewport at the centre.
  const step = useCallback((next: (zoom: number) => number) => {
    const from = current.current;
    const to = next(from);
    if (to === from) return;
    const view = viewport.current;
    const sized = view?.firstElementChild as HTMLElement | null | undefined;
    // Several wheel steps before a render share the first anchor: the DOM still shows that zoom.
    if (view && !anchor.current) {
      anchor.current = {
        zoom: from,
        x: { scroll: view.scrollLeft, client: view.clientWidth, offset: sized?.offsetLeft ?? 0 },
        y: { scroll: view.scrollTop, client: view.clientHeight, offset: sized?.offsetTop ?? 0 },
      };
    }
    current.current = to;
    setZoom(to);
  }, []);
  useLayoutEffect(() => {
    const from = anchor.current;
    const view = viewport.current;
    anchor.current = null;
    if (!from || !view) return;
    const sized = view.firstElementChild as HTMLElement | null;
    view.scrollLeft = anchoredScroll(from.x, zoom / from.zoom, sized?.offsetLeft);
    view.scrollTop = anchoredScroll(from.y, zoom / from.zoom, sized?.offsetTop);
  }, [zoom]);

  // A ref callback: the wheel listener must be non-passive to keep Ctrl + wheel from zooming the whole page.
  const viewportRef = useCallback(
    (element: HTMLDivElement | null) => {
      viewport.current = element;
      if (!element) return;
      let travelled = 0;
      const onWheel = (event: WheelEvent) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        travelled += event.deltaY;
        if (Math.abs(travelled) < WHEEL_PER_STEP) return;
        step(travelled < 0 ? zoomedIn : zoomedOut);
        travelled = 0;
      };
      element.addEventListener('wheel', onWheel, { passive: false });
      return () => element.removeEventListener('wheel', onWheel);
    },
    [step],
  );

  // "Vừa màn hình" does not anchor: the whole chart shows, centred by the layout.
  const fit = () => {
    const view = viewport.current;
    const chart = view?.querySelector<HTMLElement>('[role="tree"]');
    if (!view || !chart) return;
    const style = getComputedStyle(view);
    const px = (value: string) => Number.parseFloat(value) || 0;
    const space = {
      width: view.clientWidth - px(style.paddingLeft) - px(style.paddingRight),
      height: view.clientHeight - px(style.paddingTop) - px(style.paddingBottom),
    };
    // Layout size, which the scale transform does not change: the chart at 100%.
    const fitted = fitZoom(space, { width: chart.offsetWidth, height: chart.offsetHeight });
    current.current = fitted;
    setZoom(fitted);
    view.scrollTo?.({ left: 0, top: 0 });
  };

  return {
    zoom,
    viewportRef,
    zoomIn: () => step(zoomedIn),
    zoomOut: () => step(zoomedOut),
    canZoomIn: zoom < ZOOM_MAX,
    canZoomOut: zoom > ZOOM_MIN,
    fit,
  };
}
