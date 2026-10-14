import { Download, FileBadge2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DetailList } from '@/components/ui/detail-list';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import { formatDate, toIsoDate } from '@/lib/format';
import { attachmentKey, deleteAttachment, downloadAttachment, uploadAttachment,
  useEmployeeAttachments, type Attachment } from '../profile-documents-api';
import { certificatesKey, removeCertificate, saveCertificate, useEmployeeCertificates,
  type CertificateBody, type EmployeeCertificate } from '../profile-qualifications-api';
import { ProfileCertificateFormDialog } from './profile-certificate-form-dialog';
import { ProfileRecordsState } from './profile-records-state';

export type ProfileCertificatesSectionProps = {
  employeeId: string;
  canEdit: boolean;
  canReadFiles: boolean;
  canEditFiles: boolean;
  onDirtyChange: (value: boolean) => void;
};

export function ProfileCertificatesSection({ employeeId, canEdit, canReadFiles, canEditFiles, onDirtyChange }: ProfileCertificatesSectionProps) {
  const { t } = useTranslation();
  const k = 'employees.profile.qualifications';
  const query = useEmployeeCertificates(employeeId);
  const files = useEmployeeAttachments(employeeId, canReadFiles);
  const cache = useQueryClient();
  const toast = useToast();
  const [editor, setEditor] = useState<EmployeeCertificate | null | undefined>();
  const [removing, setRemoving] = useState<EmployeeCertificate | null>(null);
  const [pending, setPending] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const refresh = () => cache.invalidateQueries({ queryKey: certificatesKey(employeeId) });
  const save = async (body: CertificateBody, file: File | null) => {
    let uploaded: Attachment | null = null;
    if (file) uploaded = await uploadAttachment(employeeId, file);
    try { await saveCertificate(employeeId, { ...body, attachmentId: uploaded?.id ?? body.attachmentId }, editor?.id); }
    catch (error) {
      if (uploaded) await deleteAttachment(employeeId, uploaded.id).catch(() => undefined);
      throw error;
    }
    await Promise.all([refresh(), uploaded ? cache.invalidateQueries({ queryKey: attachmentKey(employeeId) }) : Promise.resolve()]);
    toast({ variant: 'success', message: t(`${k}.certificateSaved`) });
  };
  const remove = async () => {
    if (!removing || pending) return;
    setPending(true);
    try {
      await removeCertificate(employeeId, removing.id);
      await refresh(); setRemoving(null);
      toast({ variant: 'success', message: t(`${k}.certificateDeleted`) });
    } catch { toast({ variant: 'danger', message: t(`${k}.deleteFailed`) }); }
    finally { setPending(false); }
  };
  const download = async (file: Attachment) => {
    setDownloading(file.id);
    try { await downloadAttachment(employeeId, file); }
    catch { toast({ variant: 'danger', message: t(`${k}.downloadFailed`) }); }
    finally { setDownloading(null); }
  };
  const date = (value: string | null) => value ? <span className="tabular-nums">{formatDate(value)}</span> : t('employees.none');
  const today = toIsoDate(new Date());
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading">{t(`${k}.certificates`)}</h2>
        {canEdit ? <Button onClick={() => setEditor(null)}><Plus aria-hidden="true" />{t(`${k}.addCertificate`)}</Button> : null}
      </div>
      <ProfileRecordsState query={query} section="certificates">
        {query.data?.length ? <div className="grid items-start gap-4 lg:grid-cols-2">
          {query.data.map(record => {
            const file = files.data?.find(each => each.id === record.attachmentId);
            return <Card key={record.id} title={record.name}
              titleAside={record.expiresAt && record.expiresAt < today ? <Badge variant="warning">{t(`${k}.expired`)}</Badge> : undefined}
              actions={canEdit ? <>
                <Button variant="secondary" size="sm" disabled={pending} aria-label={t(`${k}.editNamed`, { name: record.name })}
                  onClick={() => setEditor(record)}><Pencil aria-hidden="true" />{t('employees.profile.edit')}</Button>
                <Button variant="secondary" size="sm" disabled={pending} aria-label={t(`${k}.deleteNamed`, { name: record.name })}
                  onClick={() => setRemoving(record)}><Trash2 aria-hidden="true" />{t(`${k}.delete`)}</Button>
              </> : undefined}>
              <DetailList items={[
                { label: t(`${k}.issuer`), value: record.issuer || t('employees.none') },
                { label: t(`${k}.issuedAt`), value: date(record.issuedAt) },
                { label: t(`${k}.expiresAt`), value: date(record.expiresAt) },
              ]} />
              {record.attachmentId ? <div className="border-t border-line pt-3">
                {!canReadFiles ? <p className="text-caption text-ink-muted">{t(`${k}.attachmentRestricted`)}</p>
                  : files.isPending ? <p className="text-caption text-ink-muted">{t(`${k}.attachmentLoading`)}</p>
                  : files.isError ? <Button variant="secondary" size="sm" onClick={() => void files.refetch()}>{t(`${k}.attachmentRetry`)}</Button>
                  : file ? <Button variant="secondary" size="sm" disabled={downloading !== null}
                    onClick={() => void download(file)}><Download aria-hidden="true" />{t(`${k}.downloadNamed`, { name: file.fileName })}</Button>
                    : <p className="text-caption text-ink-muted">{t(`${k}.attachmentMissing`)}</p>}
              </div> : null}
            </Card>;
          })}
        </div> : <Card bare><EmptyState icon={<FileBadge2 />} title={t(`${k}.certificatesEmpty`)}
          description={t(`${k}.certificatesEmptyText`)} /></Card>}
      </ProfileRecordsState>
      {editor !== undefined ? <ProfileCertificateFormDialog key={editor?.id ?? 'new'} record={editor}
        attachments={files.data ?? []} canEditFiles={canEditFiles} onDirty={onDirtyChange}
        onClose={() => { onDirtyChange(false); setEditor(undefined); }} onSave={save} /> : null}
      <ConfirmDialog open={removing !== null} title={t(`${k}.deleteNamed`, { name: removing?.name ?? '' })}
        description={t(`${k}.deleteHint`)} confirmLabel={t(`${k}.delete`)} pending={pending}
        onCancel={() => { if (!pending) setRemoving(null); }} onConfirm={() => void remove()} />
    </section>
  );
}
