// HRM-10: contracts are salary source documents; amendments change effective-dated salary.
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { employeeContractsKey, useEmployeeContracts, type EmploymentContract } from '../api';
import { contractState, groupContracts } from '../contract-status';
import { createAmendment, createContract, deleteContract, reviseContract,
  contractAmendmentsKey, type ContractWrite, type AmendmentWrite } from '../write';
import { AmendmentFormDialog } from './amendment-form-dialog';
import { ContractAmendmentHistory } from './contract-amendment-history';
import { ContractCard } from './contract-card';
import { ContractFormDialog } from './contract-form-dialog';

export type ProfileContractsSectionProps = {
  employeeId: string;
  canReadContracts: boolean;
  /** Requires EMPLOYEE_EDIT and EMPLOYEE_SENSITIVE_VIEW. Backend repeats permission checks. */
  canEdit?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

export function ProfileContractsSection({
  employeeId, canReadContracts, canEdit = false, onDirtyChange = () => {},
}: ProfileContractsSectionProps) {
  const { t } = useTranslation();
  const key = 'employees.profile.contracts';
  const manage = `${key}.manage`;
  const cache = useQueryClient();
  const toast = useToast();
  const query = useEmployeeContracts(employeeId, canReadContracts);
  const [editor, setEditor] = useState<EmploymentContract | null | undefined>();
  const [amending, setAmending] = useState<EmploymentContract | null>(null);
  const [removing, setRemoving] = useState<EmploymentContract | null>(null);
  const [removingPending, setRemovingPending] = useState(false);
  const [deleteProblem, setDeleteProblem] = useState<string | null>(null);
  const allowedToEdit = canReadContracts && canEdit;
  const closeDirty = () => onDirtyChange(false);
  const refresh = async () => {
    await cache.invalidateQueries({ queryKey: employeeContractsKey(employeeId) });
    await cache.invalidateQueries({ queryKey: ['salary-profile', employeeId] });
  };
  const saveContract = async (body: ContractWrite) => {
    if (!allowedToEdit) throw new Error('Not allowed');
    if (editor) await reviseContract(employeeId, editor.id, body);
    else await createContract(employeeId, body);
    await refresh();
    toast({ variant: 'success', message: t(`${manage}.saved`) });
  };
  const saveAmendment = async (body: AmendmentWrite) => {
    if (!amending || !allowedToEdit) throw new Error('Not allowed');
    await createAmendment(employeeId, amending.id, body);
    await cache.invalidateQueries({ queryKey: contractAmendmentsKey(employeeId, amending.id) });
    await refresh();
    toast({ variant: 'success', message: t(`${manage}.amendmentSaved`) });
  };
  const requestDelete = async () => {
    if (!removing || !allowedToEdit || removingPending) return;
    setRemovingPending(true); setDeleteProblem(null);
    try {
      await deleteContract(employeeId, removing.id);
      await refresh();
      setRemoving(null);
      toast({ variant: 'success', message: t(`${manage}.deleted`) });
    } catch (e) {
      const code = e instanceof ApiError && e.code === 'contract.has_amendments' ? 'hasAmendments'
        : e instanceof ApiError && e.code === 'contract.salary_source_locked' ? 'sourceLocked'
        : e instanceof ApiError && e.status === 403 ? 'forbidden' : 'deleteFailed';
      setRemoving(null); setDeleteProblem(t(`${manage}.${code}`));
    } finally { setRemovingPending(false); }
  };

  const card = (contract: EmploymentContract) => <ContractCard key={contract.id} contract={contract}
    canRevealPay actions={allowedToEdit ? <>
      <Button size="sm" variant="secondary" onClick={() => setAmending(contract)}>
        <Plus aria-hidden="true" />{t(`${manage}.addAmendment`)}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setEditor(contract)}
        aria-label={t(`${manage}.editNamed`, { number: contract.contractNumber })}>
        <Pencil aria-hidden="true" />{t('employees.profile.edit')}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => { setRemoving(contract); setDeleteProblem(null); }}
        aria-label={t(`${manage}.deleteNamed`, { number: contract.contractNumber })}>
        <Trash2 aria-hidden="true" />{t(`${manage}.delete`)}
      </Button>
    </> : undefined}>
    <ContractAmendmentHistory employeeId={employeeId} contractId={contract.id} />
  </ContractCard>;

  if (!canReadContracts || query.error instanceof ApiError && query.error.status === 403)
    return <Card bare><StateBlock variant="denied" title={t(`${key}.deniedTitle`)}
      description={t(`${key}.deniedText`)} /></Card>;
  if (query.isPending) return <Card bare><div className="p-4 md:p-6">
    <Loading label={t(`${key}.loading`)} /></div></Card>;
  if (query.isError) return <Card bare><ErrorState title={t(`${key}.loadError`)}
    onRetry={() => void query.refetch()} /></Card>;

  const { current, other } = groupContracts(query.data ?? []);
  const expiring = current.filter(contract => contractState(contract) === 'expiring');
  return <section className="flex flex-col gap-5" aria-label={t('employees.profile.tab.contracts')}>
    {allowedToEdit ? <div className="flex justify-end">
      <Button onClick={() => setEditor(null)}><Plus aria-hidden="true" />{t(`${manage}.add`)}</Button>
    </div> : null}
    {deleteProblem ? <Alert variant="warning" title={deleteProblem} /> : null}
    {query.data?.length === 0 ? (
      <Card bare><EmptyState icon={<FileText aria-hidden="true" />}
        title={t(`${key}.emptyTitle`)} description={t(`${key}.emptyText`)} /></Card>
    ) : <>
      <p className="text-caption text-ink-muted">{t(`${key}.privacyHint`)}</p>
      {expiring.length > 0 ? <Alert variant="warning" title={t(`${key}.expiringTitle`)}>
        {t(`${key}.expiringText`, { count: expiring.length })}
      </Alert> : null}
      {current.length > 0 ? <section className="flex flex-col gap-3">
        <h2 className="text-heading">{t(`${key}.currentTitle`)}</h2>
        <div className="grid items-start gap-4 lg:grid-cols-2">{current.map(card)}</div>
      </section> : null}
      {other.length > 0 ? <section className="flex flex-col gap-3">
        <h2 className="text-heading">{t(`${key}.historyTitle`)}</h2>
        <div className="grid items-start gap-4 lg:grid-cols-2">{other.map(card)}</div>
      </section> : null}
    </>}
    {allowedToEdit && editor !== undefined ?
      <ContractFormDialog key={editor?.id ?? 'create'} contract={editor} contracts={query.data ?? []}
        onDirty={onDirtyChange} onClose={() => { closeDirty(); setEditor(undefined); }} onSave={saveContract} /> : null}
    {allowedToEdit && amending ?
      <AmendmentFormDialog key={amending.id} contract={amending}
        onDirty={onDirtyChange} onClose={() => { closeDirty(); setAmending(null); }} onSave={saveAmendment} /> : null}
    <ConfirmDialog open={allowedToEdit && removing !== null}
      title={t(`${manage}.deleteNamed`, { number: removing?.contractNumber ?? '' })}
      description={t(`${manage}.deleteHint`)}
      confirmLabel={t(`${manage}.delete`)} pending={removingPending}
      onCancel={() => { if (!removingPending) setRemoving(null); }}
      onConfirm={() => void requestDelete()} />
  </section>;
}
