// "Đính kèm tệp": files go up as soon as they are picked (PDF, image, Word, Excel; 5 MB each, 5 at most) and are
// named in the request when it is sent. A type that needs a file says so here when none is attached.
import { Paperclip, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { formatFileSize } from '@/lib/format';
import type { LeaveAttachment } from '../api';
import { uploadLeaveAttachment } from '../request-api';
import { FILES_MAX } from '../use-leave-form';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.docx,.xlsx';
const UPLOAD_ERRORS = ['attachment.file_too_large', 'attachment.unsupported_type', 'attachment.invalid_name', 'attachment.file_invalid'];

export type LeaveFilesFieldProps = {
  files: LeaveAttachment[];
  onAdd: (file: LeaveAttachment) => void;
  onRemove: (id: string) => void;
  /** The type needs a file and none is attached: the sentence of the check. */
  required?: string;
};

export function LeaveFilesField({ files, onAdd, onRemove, required }: LeaveFilesFieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setFailed(null);
    setUploading(file.name);
    try {
      onAdd(await uploadLeaveAttachment(file));
    } catch (error) {
      const code = error instanceof ApiError && UPLOAD_ERRORS.includes(error.code) ? error.code.replace('attachment.', '') : 'failed';
      setFailed(t(`leave.files.error.${code}`, { name: file.name }));
    } finally {
      setUploading(null);
      if (input.current) input.current.value = '';
    }
  };
  const error = failed ?? required;
  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="text-[14px] leading-5 font-medium">
        {t('leave.files.label')}
      </span>
      {files.length ? (
        <ul aria-labelledby={`${id}-label`} className="flex flex-col gap-1">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-2 rounded-sm border border-line px-3 py-1">
              <Paperclip aria-hidden="true" className="size-4 shrink-0 stroke-[1.5] text-ink-muted" />
              <span className="min-w-0 flex-1 truncate">{file.fileName}</span>
              <span className="text-caption text-ink-muted">{formatFileSize(file.sizeBytes)}</span>
              <Button variant="ghost" size="icon-sm" aria-label={t('leave.files.remove', { name: file.fileName })} onClick={() => onRemove(file.id)}>
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => void pick(event.target.files?.[0])} />
      <Button variant="secondary" className="self-start max-md:h-11" disabled={Boolean(uploading) || files.length >= FILES_MAX} aria-describedby={`${id}-note`} onClick={() => input.current?.click()}>
        <Paperclip aria-hidden="true" />
        {uploading ? t('leave.files.uploading', { name: uploading }) : t('leave.files.add')}
      </Button>
      {error ? (
        <span id={`${id}-note`} role="alert" className="text-caption text-danger">
          {error}
        </span>
      ) : (
        <span id={`${id}-note`} className="text-caption text-ink-muted">
          {t('leave.files.helper', { max: FILES_MAX })}
        </span>
      )}
    </div>
  );
}
