// Library component "Image upload": picks one image, shows it, and lets the user replace or remove it.
// The image is saved as soon as it is chosen. The consumer checks type and size in `onSelect` and passes `error`.
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Skeleton } from './skeleton';

export type ImageUploadProps = {
  /** URL of the current image, or none. */
  src?: string | null;
  /** What the image is: "Logo Công ty …". */
  alt: string;
  /** Accepted MIME types for the file dialog, e.g. "image/png,image/jpeg". */
  accept: string;
  uploadLabel: string;
  replaceLabel: string;
  removeLabel: string;
  /** Accepted types, size limit and the best shape; "Đang tải logo lên…" while uploading. */
  helper: string;
  /** Shown instead of the helper while a file is dragged over the block. */
  dropHint?: string;
  /** Replaces the helper: names the file, the cause and the fix. */
  error?: string;
  uploading?: boolean;
  disabled?: boolean;
  onSelect: (file: File) => void;
  /** Asks first with a confirm Dialog; the button shows only when there is an image. */
  onRemove?: () => void;
  className?: string;
};

export function ImageUpload({ src, alt, accept, uploadLabel, replaceLabel, removeLabel, helper, dropHint, error, uploading = false, disabled = false, onSelect, onRemove, className }: ImageUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const locked = uploading || disabled;
  const label = src ? replaceLabel : uploadLabel;

  const onDrag = (event: DragEvent) => {
    if (locked) return;
    event.preventDefault();
    setDragging(event.type !== 'dragleave');
  };
  const onDrop = (event: DragEvent) => {
    if (locked) return;
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onSelect(file);
  };

  return (
    <div aria-busy={uploading || undefined} onDragOver={onDrag} onDragLeave={onDrag} onDrop={onDrop} className={cn('flex items-start gap-4', className)}>
      <span
        className={cn(
          'grid size-18 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-surface text-ink-muted md:size-24',
          !src && !uploading && 'border-dashed border-ink-muted bg-surface-muted',
          dragging && 'border-dashed border-brand-blue bg-brand-blue-soft text-brand-blue',
          error && 'border-danger',
        )}
      >
        {uploading ? (
          <Skeleton className="size-full rounded-none" />
        ) : dragging ? (
          <Upload aria-hidden="true" className="size-5 stroke-[1.5]" />
        ) : src ? (
          <img src={src} alt={alt} className="size-full object-contain" />
        ) : (
          <ImageIcon aria-hidden="true" className="size-5 stroke-[1.5]" />
        )}
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap gap-2 [&_button]:h-11 md:[&_button]:h-10">
          <Button variant="secondary" disabled={locked} onClick={() => input.current?.click()}>
            <Upload aria-hidden="true" />
            {label}
          </Button>
          {src && onRemove ? (
            <Button variant="ghost" disabled={locked} onClick={onRemove}>
              <Trash2 aria-hidden="true" />
              {removeLabel}
            </Button>
          ) : null}
        </div>
        {/* Driven by the upload button; hidden from everyone, so it has no tab stop of its own. */}
        <input
          ref={input}
          type="file"
          hidden
          accept={accept}
          aria-label={label}
          disabled={locked}
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Reset so that choosing the same file again fires a change.
            event.target.value = '';
            if (file) onSelect(file);
          }}
        />
        {error ? (
          <span role="alert" className="text-caption text-danger">
            {error}
          </span>
        ) : (
          <span className="text-caption text-ink-muted">{dragging && dropHint ? dropHint : helper}</span>
        )}
      </div>
    </div>
  );
}
