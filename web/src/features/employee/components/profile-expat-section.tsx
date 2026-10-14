import { useState } from 'react';
import { FileBadge, Pencil, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DetailList } from '@/components/ui/detail-list';
import { EmptyState } from '@/components/ui/empty-state';
import { MaskedValue } from '@/components/ui/masked-value';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/format';
import { deleteExpat, expatKey, useExpatDocuments, writeExpat,
  type ExpatDocument, type ExpatDocumentBody } from '../profile-documents-api';
import { ProfileRecordsState } from './profile-records-state';
import { ProfileExpatForm } from './profile-expat-form';

export function ProfileExpatSection({ employeeId, canEdit, onDirtyChange }: {
  employeeId: string; canEdit: boolean; onDirtyChange: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const k = 'employees.profile.documents';
  const query = useExpatDocuments(employeeId);
  const client = useQueryClient();
  const toast = useToast();
  const [editor, setEditor] = useState<ExpatDocument | null | undefined>();
  const [removing, setRemoving] = useState<ExpatDocument | null>(null);
  const [pending, setPending] = useState(false);
  const refresh = () => client.invalidateQueries({ queryKey: expatKey(employeeId) });
  const save = async (body: ExpatDocumentBody) => {
    await writeExpat(employeeId, body, editor?.id);
    await refresh();
    toast({ variant: 'success', message: t(`${k}.saved`) });
  };
  const remove = async () => {
    if (!removing || pending) return;
    setPending(true);
    try {
      await deleteExpat(employeeId, removing.id);
      await refresh();
      setRemoving(null);
      toast({ variant: 'success', message: t(`${k}.deleted`) });
    } catch { toast({ variant: 'danger', message: t(`${k}.writeFailed`) }); }
    finally { setPending(false); }
  };
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading">{t(`${k}.expatTitle`)}</h2>
        {canEdit ? <Button onClick={() => setEditor(null)}><Plus aria-hidden="true" />{t(`${k}.add`)}</Button> : null}
      </div>
      <ProfileRecordsState query={query} section="documents">
        {query.data?.length ? (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {query.data.map(doc => (
              <Card key={doc.id} title={t(`${k}.typeNames.${doc.documentType}`)}
                actions={canEdit && !doc.masked ? <>
                  <Button variant="secondary" size="sm" onClick={() => setEditor(doc)}
                    aria-label={t(`${k}.editNamed`, {name:t(`${k}.typeNames.${doc.documentType}`)})}>
                    <Pencil aria-hidden="true" />{t(`${k}.edit`)}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setRemoving(doc)}
                    aria-label={t(`${k}.deleteNamed`, {name:t(`${k}.typeNames.${doc.documentType}`)})}>
                    <Trash2 aria-hidden="true" />{t(`${k}.delete`)}
                  </Button>
                </> : undefined}>
                <DetailList items={[
                  {label:t(`${k}.number`),value:<MaskedValue value={doc.documentNumber}
                    revealable={!doc.masked} shown={false} onToggle={() => {}}
                    showLabel="" hideLabel="" showText="" hideText="" emptyText={t('employees.none')} />},
                  {label:t(`${k}.country`),value:doc.issuingCountry},
                  {label:t(`${k}.issued`),value:doc.issuedAt ? formatDate(doc.issuedAt) : t('employees.none')},
                  {label:t(`${k}.expires`),value:<span className="tabular-nums">{formatDate(doc.expiresAt)}</span>},
                ]} />
              </Card>
            ))}
          </div>
        ) : <Card bare><EmptyState icon={<FileBadge />} title={t(`${k}.expatEmpty`)}
          description={t(`${k}.expatEmptyText`)} /></Card>}
      </ProfileRecordsState>
      {editor !== undefined ? <ProfileExpatForm key={editor?.id ?? 'new'} document={editor}
        onSave={save} onDirty={onDirtyChange} onClose={() => { onDirtyChange(false); setEditor(undefined); }} /> : null}
      <ConfirmDialog open={removing !== null} pending={pending}
        title={t(`${k}.deleteNamed`, {name:removing ? t(`${k}.typeNames.${removing.documentType}`) : ''})}
        description={t(`${k}.confirmDelete`)} confirmLabel={t(`${k}.delete`)}
        onCancel={() => { if (!pending) setRemoving(null); }} onConfirm={() => void remove()} />
    </section>
  );
}
