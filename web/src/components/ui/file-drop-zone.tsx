// Library component "File drop zone" (`hrm-dropzone`): pick one file, or drop it on the box. The real control is the
// "Chọn file" Button, which opens a hidden file input; dropping is an extra. Not `hrm-upload` (an image tile).
import { FileSpreadsheet, LoaderCircle, Upload } from 'lucide-react';
import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatFileSize } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from './button';

export type FileDropZoneState = 'idle' | 'busy' | 'selected' | 'error' | 'disabled';

export type FileDropZoneProps = {
  /** The input's `accept`, e.g. `.xlsx`. The consumer still checks the file it gets. */
  accept: string;
  /** "Kéo thả file Excel vào đây". */
  title: string;
  /** The limits: "Chỉ nhận .xlsx, tối đa 5 MB và 1.000 dòng." */
  helper: string;
  state: FileDropZoneState;
  /** The file being worked on (`busy`, `selected`). */
  fileName?: string;
  fileSize?: number;
  /** `busy`: what is happening, "Đang đọc file…". */
  statusText?: string;
  /** `error`: why the file was refused; shown under the box as an alert. */
  error?: string;
  /** Lucide 24px icon of the idle box; an upload arrow by default. */
  icon?: ReactNode;
  onSelect: (file: File) => void;
  /** `busy`: stops the work ("Hủy"). */
  onCancel?: () => void;
  className?: string;
};

export function FileDropZone({ accept, title, helper, state, fileName, fileSize, statusText, error, icon, onSelect, onCancel, className }: FileDropZoneProps) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const id = useId();
  const busy = state === 'busy';
  const blocked = busy || state === 'disabled';
  const showError = state === 'error' && Boolean(error);
  const describedBy = `${id}-helper${showError ? ` ${id}-error` : ''}`;

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file && !blocked) onSelect(file);
  };
  const onDragOver = (event: DragEvent) => {
    if (blocked) return;
    event.preventDefault();
    setOver(true);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    pick(event.dataTransfer.files);
  };
  const choose = (
    <Button variant="secondary" disabled={blocked} aria-describedby={describedBy} onClick={() => input.current?.click()}>
      {t(state === 'selected' ? 'dropZone.change' : 'dropZone.choose')}
    </Button>
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        aria-busy={busy || undefined}
        onDragOver={onDragOver}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex min-h-42 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-ink-muted bg-surface-muted p-6 text-center',
          over && 'border-brand-blue bg-brand-blue-soft',
          showError && 'border-danger',
          state === 'disabled' && 'opacity-60',
        )}
      >
        {busy || state === 'selected' ? (
          <>
            <span className="flex max-w-full items-center gap-2">
              <FileSpreadsheet aria-hidden="true" className="size-5 shrink-0 stroke-[1.5] text-ink-muted" />
              <span className="truncate text-body-strong">{fileName}</span>
              {fileSize !== undefined ? <span className="shrink-0 text-ink-muted tabular-nums">{formatFileSize(fileSize)}</span> : null}
            </span>
            {busy ? (
              <>
                <span role="status" className="flex items-center gap-2 text-ink-muted">
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin stroke-[1.5] motion-reduce:animate-none" />
                  {statusText}
                </span>
                {onCancel ? (
                  <Button variant="ghost" size="sm" onClick={onCancel}>
                    {t('dropZone.cancel')}
                  </Button>
                ) : null}
              </>
            ) : (
              choose
            )}
          </>
        ) : (
          <>
            <span aria-hidden="true" className={cn('[&_svg]:size-6 [&_svg]:stroke-[1.5]', over ? 'text-brand-blue' : 'text-ink-muted')}>
              {icon ?? <Upload />}
            </span>
            <span className="text-body-strong">{title}</span>
            <span className="flex items-center gap-3 text-ink-muted">
              {t('dropZone.or')}
              {choose}
            </span>
          </>
        )}
        <input ref={input} type="file" accept={accept} tabIndex={-1} aria-hidden="true" className="hidden" onChange={(event) => {
          pick(event.target.files);
          // The same file again must fire `change` again.
          event.target.value = '';
        }} />
      </div>
      <p id={`${id}-helper`} className="text-caption text-ink-muted">
        {helper}
      </p>
      {showError ? (
        <p id={`${id}-error`} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
