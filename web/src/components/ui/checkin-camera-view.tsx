// Library component "Camera view" (HRM-39, proposed on the main canvas row `#39`, not yet in the HRM design system):
// the viewfinder of the check-in. The live front camera, mirrored like a mirror, with an oval face guide and the
// Location chip over it; once the photo is taken, the still frame takes its place while it is sent. The caller owns
// the stream and sets it on the `<video>` through `videoRef`.
import type { ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

export type CheckinCameraViewProps = {
  /** The `<video>` element the stream is set on. */
  videoRef: Ref<HTMLVideoElement>;
  /** Accessible name of the picture: "Camera trước". */
  label: string;
  /** The camera is running: the picture and the face guide show. */
  live: boolean;
  /** The photo taken (an object URL): shown in place of the live picture. */
  still?: string;
  /** Alt text of the still photo. */
  stillLabel?: string;
  /** Over the top of the picture: the Location chip. */
  chip?: ReactNode;
  /** Shown over a dark picture area with nothing to see: "Đang mở camera…", "Chưa mở được camera". */
  message?: ReactNode;
  className?: string;
};

export function CheckinCameraView({ videoRef, label, live, still, stillLabel = '', chip, message, className }: CheckinCameraViewProps) {
  return (
    <div className={cn('relative aspect-3/4 w-full overflow-hidden rounded-md bg-ink', className)}>
      {/* Mirrored for the Employee, as a front camera always is; the photo that is sent is not. */}
      <video
        ref={videoRef}
        aria-label={label}
        playsInline
        muted
        autoPlay
        className={cn('absolute inset-0 size-full -scale-x-100 object-cover', (!live || still) && 'invisible')}
      />
      {still ? <img src={still} alt={stillLabel} className="absolute inset-0 size-full -scale-x-100 object-cover" /> : null}
      {live && !still ? (
        // The face guide is an ellipse: `rounded-full` would make a pill of a box that is not square, and the design system has no ellipse token.
        <div aria-hidden="true" className="absolute top-1/2 left-1/2 h-3/5 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-on-brand/80" />
      ) : null}
      {message ? <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-body-small text-on-brand">{message}</p> : null}
      {chip ? <div className="absolute inset-x-3 top-3">{chip}</div> : null}
    </div>
  );
}
