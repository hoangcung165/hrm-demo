import { useRef, useState, type ChangeEvent } from 'react';
import { Download, FileText, Trash2, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DetailList } from '@/components/ui/detail-list';
import { EmptyState } from '@/components/ui/empty-state';
import { StateBlock } from '@/components/ui/state-block';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/format';
import { attachmentKey, deleteAttachment, downloadAttachment,
  uploadAttachment, useEmployeeAttachments, type Attachment } from '../profile-documents-api';
import { certificatesKey } from '../profile-qualifications-api';
import { ProfileRecordsState } from './profile-records-state';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = /\.(pdf|png|jpe?g|docx|xlsx)$/i;

export function ProfileAttachmentsSection({ employeeId, canRead, canEdit }: {
  employeeId: string; canRead: boolean; canEdit: boolean;
}) {
  const { t } = useTranslation();
  const k = 'employees.profile.documents';
  const toast = useToast();
  const cache = useQueryClient();
  const [pending, setPending] = useState(false);
  const [busyDownload, setBusyDownload] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Attachment | null>(null);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  // Authorization is enforced by backend. Do not issue sensitive GETs when client already knows access is absent.
  const query = useEmployeeAttachments(employeeId, canRead);
  const refresh = () => cache.invalidateQueries({ queryKey: attachmentKey(employeeId) });
  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file || pending) return;
    if (file.size === 0 || file.size > MAX_BYTES || !ALLOWED.test(file.name)) {
      setError(t(`${k}.invalidFile`)); return;
    }
    setPending(true); setError('');
    try {
      await uploadAttachment(employeeId, file);
      await refresh();
      toast({variant:'success',message:t(`${k}.uploaded`)});
    } catch {
      setError(t(`${k}.uploadFailed`));
    } finally { setPending(false); }
  };
  const download = async (file: Attachment) => {
    if (busyDownload) return;
    setBusyDownload(file.id);
    try { await downloadAttachment(employeeId, file); }
    catch { toast({variant:'danger',message:t(`${k}.downloadFailed`)}); }
    finally { setBusyDownload(null); }
  };
  const remove = async () => {
    if (!removing || pending) return;
    setPending(true);
    try {
      await deleteAttachment(employeeId, removing.id);
      await Promise.all([refresh(), cache.invalidateQueries({ queryKey: certificatesKey(employeeId) })]);
      setRemoving(null);
      toast({variant:'success',message:t(`${k}.deleted`)});
    } catch { toast({variant:'danger',message:t(`${k}.writeFailed`)}); }
    finally { setPending(false); }
  };
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading">{t(`${k}.attachmentsTitle`)}</h2>
        {canEdit ? <>
          <input ref={fileInput} className="sr-only" type="file" tabIndex={-1}
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" aria-label={t(`${k}.selectFile`)}
            onChange={e => void upload(e)} />
          <Button disabled={pending} onClick={() => fileInput.current?.click()}>
            <Upload aria-hidden="true" />{t(`${k}.upload`)}
          </Button>
        </> : null}
      </div>
      <p className="text-caption text-ink-muted">{t(`${k}.fileHint`)}</p>
      {error ? <p role="alert" className="text-caption text-danger">{error}</p> : null}
      {!canRead ? <Card bare><StateBlock variant="denied" title={t('employees.profile.records.deniedTitle')}
        description={t('employees.profile.records.deniedText')} /></Card> : (
        <ProfileRecordsState query={query} section="documents">
          {query.data?.length ? <div className="grid items-start gap-4 lg:grid-cols-2">
            {query.data.map(file => (
              <Card key={file.id} title={file.fileName} actions={<>
                <Button variant="secondary" size="sm" disabled={busyDownload !== null} onClick={() => void download(file)}
                  aria-label={t(`${k}.downloadNamed`,{name:file.fileName})}>
                  <Download aria-hidden="true" />{t(`${k}.download`)}
                </Button>
                {canEdit ? <Button variant="secondary" size="sm" disabled={pending}
                  aria-label={t(`${k}.deleteNamed`,{name:file.fileName})} onClick={() => setRemoving(file)}>
                  <Trash2 aria-hidden="true" />{t(`${k}.delete`)}
                </Button> : null}
              </>}>
                <DetailList items={[
                  {label:t(`${k}.uploadedAt`),value:formatDate(file.uploadedAt)},
                  {label:t(`${k}.fileSize`),value:`${Math.ceil(file.contentLength / 1024)} KB`},
                ]} />
              </Card>
            ))}
          </div> : <Card bare><EmptyState icon={<FileText />}
            title={t(`${k}.filesEmpty`)} description={t(`${k}.filesEmptyText`)} /></Card>}
        </ProfileRecordsState>
      )}
      <ConfirmDialog open={removing !== null} title={t(`${k}.deleteNamed`,{name:removing?.fileName ?? ''})}
        description={t(`${k}.confirmDelete`)} confirmLabel={t(`${k}.delete`)}
        pending={pending} onCancel={() => { if (!pending) setRemoving(null); }}
        onConfirm={() => void remove()} />
    </section>
  );
}
