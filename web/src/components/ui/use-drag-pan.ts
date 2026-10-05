// Pan a scrolling viewport by dragging its background with the mouse. Touch and the wheel scroll it natively.
import { useRef, useState, type PointerEvent } from 'react';

type Drag = { x: number; y: number; left: number; top: number };

/** Spread `handlers` on the scrolling element. A drag that starts on `ignore` (cards, controls) does not pan. */
export function useDragPan(ignore: string) {
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState(false);
  const stop = () => {
    drag.current = null;
    setDragging(false);
  };
  return {
    dragging,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'mouse' || event.button !== 0 || (event.target as Element).closest(ignore)) return;
        const view = event.currentTarget;
        drag.current = { x: event.clientX, y: event.clientY, left: view.scrollLeft, top: view.scrollTop };
        view.setPointerCapture?.(event.pointerId);
        setDragging(true);
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const from = drag.current;
        if (!from) return;
        event.currentTarget.scrollLeft = from.left - (event.clientX - from.x);
        event.currentTarget.scrollTop = from.top - (event.clientY - from.y);
      },
      onPointerUp: stop,
      onPointerCancel: stop,
    },
  };
}
