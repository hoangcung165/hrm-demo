// HRM-10 contracts: document writes create immutable effective-dated salary profiles.
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Pencil, FilePlus2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { employeeContractsKey, useEmployeeContracts, type EmploymentContract } from '../api';
import { contractState, groupContracts } from '../contract-status';
import { createAmendment, createContract, reviseContract, contractAmendmentsKey, type AmendmentWrite, type ContractWrite } from '../write';
import { AmendmentFormDialog } from './amendment-form-dialog';
import { ContractAmendmentHistory } from './contract-amendment-history';
import { ContractCard } from './contract-card';
import { ContractFormDialog } from './contract-form-dialog';

export type ProfileContractsSectionProps = {
  employeeId: string;
  canReadContracts: boolean;
  canEdit?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

export function ProfileContractsSection({ employeeId, canReadContracts, canEdit = false,
  onDirtyChange = () => {} }: ProfileContractsSectionProps) {
  const { t } = useTranslation();
  const key = 'employees.profile.contracts';
  const k = `${key}.manage`;
  const cache = useQueryClient();
  const toast = useToast();
  const query = useEmployeeContracts(employeeId, canReadContracts);
  // undefined = closed, null = creating; a record = editing.
  const [editor, setEditor] = useState<EmploymentContract | null | undefined>();
  const [amending, setAmending] = useState<EmploymentContract | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<EmploymentContract | null>(null);
  const refresh = async () => {
    await cache.invalidateQueries({ queryKey: employeeContractsKey(employeeId) });
  };
  const save = async (body: ContractWrite) => {
    if (editor) await reviseContract(employeeId, editor.id, body);
    else await createContract(employeeId, body);
    await refresh();
    toast({ variant: 'success', message: t(`${k}.saved`) });
  };
  const amend = async (body: AmendmentWrite) => {
    if (!amending) return;
    await createAmendment(employeeId, amending.id, body);
    await Promise.all([
      refresh(),
      cache.invalidateQueries({ queryKey: contractAmendmentsKey(employeeId, amending.id) }),
    ]);
    toast({ variant: 'success', message: t(`${k}.amendmentSaved`, { number: body.amendmentNumber, date: body.effectiveOn }) });
  };
  // Both permissions are enforced by BE; avoid even fetching sensitive fields for unauthorised callers.
  if (!canReadContracts || (query.error instanceof ApiError && query.error.status === 403)) {
    return <Card bare><StateBlock variant="denied" title={t(`${key}.deniedTitle`)}
      description={t(`${key}.deniedText`)} /></Card>;
  }
  const header = canEdit ? (
    <div className="flex justify-end">
      <Button onClick={() => setEditor(null)}><Plus aria-hidden="true" />{t(`${k}.add`)}</Button>
    </div>
  ) : null;
  const action = (record: EmploymentContract) => !canEdit ? undefined : (
    <>
      <Button size="sm" variant="secondary" aria-label={t(`${k}.amendNamed`, { number: record.contractNumber })}
        onClick={() => setAmending(record)}><FilePlus2 aria-hidden="true" />{t(`${k}.amend`)}</Button>
      <Button size="sm" variant="secondary" aria-label={t(`${k}.editNamed`, { number: record.contractNumber })}
        onClick={() => setEditor(record)}><Pencil aria-hidden="true" />{t(`${k}.edit`)}</Button>
      <Button size="sm" variant="ghost" aria-label={t(`${k}.deleteNamed`, { number: record.contractNumber })}
        onClick={() => setDeleteInfo(record)}><Trash2 aria-hidden="true" />{t(`${k}.delete`)}</Button>
    </>
  );
  const editorNode = editor !== undefined ? (
    <ContractFormDialog key={editor?.id ?? 'new'} contract={editor}
      contracts={query.data ?? []} onDirty={onDirtyChange}
      onClose={() => { onDirtyChange(false); setEditor(undefined); }} onSave={save} />
  ) : null;
  const amendmentNode = amending ? (
    <AmendmentFormDialog key={amending.id} contract={amending} onDirty={onDirtyChange}
      onClose={() => { onDirtyChange(false); setAmending(null); }} onSave={amend} />
  ) : null;
  const deleteNode = deleteInfo ? (
    <Dialog open title={t(`${k}.deleteNamed`, { number: deleteInfo.contractNumber })}
      description={t(`${k}.lockedDelete`)} onOpenChange={open => { if (!open) setDeleteInfo(null); }}
      footer={<Button variant="secondary" onClick={() => setDeleteInfo(null)}>{t(`${k}.close`)}</Button>}>
      <Alert variant="warning" title={t(`${k}.lockedTitle`)}>
        {t(`${k}.lockedHelp`)}
      </Alert>
    </Dialog>
  ) : null;

  if (query.isPending) return <section className="flex flex-col gap-4">{header}
    <Card bare><div className="p-4 md:p-6"><Loading label={t(`${key}.loading`)} /></div></Card>
    {editorNode}</section>;
  if (query.isError) return <section className="flex flex-col gap-4">{header}
    <Card bare><ErrorState title={t(`${key}.loadError`)} onRetry={() => void query.refetch()} /></Card>
    {editorNode}</section>;
  if (!query.data?.length) return <section className="flex flex-col gap-4">{header}
    <Card bare><EmptyState icon={<FileText aria-hidden="true" />} title={t(`${key}.emptyTitle`)}
      description={t(`${key}.emptyText`)} /></Card>{editorNode}</section>;

  const { current, other } = groupContracts(query.data);
  const expiring = current.filter(c => contractState(c) === 'expiring');
  const cards = (rows: EmploymentContract[]) => rows.map(c => (
    <ContractCard key={c.id} contract={c} canRevealPay actions={action(c)}>
      <ContractAmendmentHistory employeeId={employeeId} contractId={c.id} />
    </ContractCard>
  ));
  return (
    <section className="flex flex-col gap-5" aria-label={t('employees.profile.tab.contracts')}>
      {header}
      <p className="text-caption text-ink-muted">{t(`${key}.privacyHint`)}</p>
      {expiring.length > 0 ? <Alert variant="warning" title={t(`${key}.expiringTitle`)}>
        {t(`${key}.expiringText`, { count: expiring.length })}
      </Alert> : null}
      {current.length > 0 ? <section className="flex flex-col gap-3">
        <h2 className="text-heading">{t(`${key}.currentTitle`)}</h2>
        <div className="grid items-start gap-4 lg:grid-cols-2">{cards(current)}</div>
      </section> : null}
      {other.length > 0 ? <section className="flex flex-col gap-3">
        <h2 className="text-heading">{t(`${key}.historyTitle`)}</h2>
        <div className="grid items-start gap-4 lg:grid-cols-2">{cards(other)}</div>
      </section> : null}
      {editorNode}{amendmentNode}{deleteNode}
    </section>
  );
}
