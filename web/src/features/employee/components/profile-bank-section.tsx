// HRM-08/FE-2A: salary bank accounts, edit actions scoped by EMPLOYEE_EDIT + SENSITIVE_VIEW.
import { Landmark, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DetailList } from '@/components/ui/detail-list';
import { MaskedValue } from '@/components/ui/masked-value';
import { useToast } from '@/components/ui/use-toast';
import { useEmployeeBanks, profileRecordsKey, type BankAccount } from '../profile-records-api';
import { saveBank, removeBank, type BankBody } from '../profile-records-write';
import { ProfileBankFormDialog } from './profile-bank-form-dialog';
import { ProfileRecordsEmpty, ProfileRecordsState } from './profile-records-state';

export function ProfileBankSection({ employeeId, canEdit = false, onDirtyChange = () => {} }: {
  employeeId: string; canEdit?: boolean; onDirtyChange?: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const key = 'employees.profile.records.edit';
  const query = useEmployeeBanks(employeeId);
  const cache = useQueryClient();
  const toast = useToast();
  const [revealedId, setRevealedId] = useState<string | null>(null);
  // undefined = closed; null = add new; an existing record = edit.
  const [editor, setEditor] = useState<BankAccount | null | undefined>();
  const [removing, setRemoving] = useState<BankAccount | null>(null);
  const [pending, setPending] = useState(false);

  const refresh = async () => {
    setRevealedId(null);
    await cache.invalidateQueries({ queryKey: profileRecordsKey(employeeId, 'bank-accounts') });
  };
  const save = async (value: BankBody) => {
    await saveBank(employeeId, value, editor?.id);
    await refresh();
    toast({ variant: 'success', message: t(`${key}.saved`) });
  };
  const selectDefault = async (account: BankAccount) => {
    if (pending || account.masked || account.defaultAccount) return;
    setPending(true);
    try {
      await saveBank(employeeId, {
        bankName: account.bankName, accountHolder: account.accountHolder,
        accountNumber: account.accountNumber, defaultAccount: true,
      }, account.id);
      await refresh();
      toast({ variant: 'success', message: t(`${key}.defaultSaved`) });
    } catch {
      toast({ variant: 'danger', message: t(`${key}.saveFailed`) });
    } finally { setPending(false); }
  };
  const deleteAccount = async () => {
    if (!removing || pending) return;
    setPending(true);
    try {
      await removeBank(employeeId, removing.id);
      await refresh();
      setRemoving(null);
      toast({ variant: 'success', message: t(`${key}.deleted`) });
    } catch {
      toast({ variant: 'danger', message: t(`${key}.deleteFailed`) });
    } finally { setPending(false); }
  };
  return (
    <ProfileRecordsState query={query} section="bank">
      <div className="flex flex-col gap-4">
        {canEdit ? (
          <div className="flex justify-end">
            <Button onClick={() => setEditor(null)}>
              <Plus aria-hidden="true" /> {t(`${key}.bankAdd`)}
            </Button>
          </div>
        ) : null}
        {query.data?.length === 0 ? (
          <ProfileRecordsEmpty section="bank" icon={<Landmark />} />
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {query.data?.map(bank => (
              <Card key={bank.id} title={bank.bankName} titleAside={bank.defaultAccount ? (
                <span className="rounded-sm bg-brand-teal-soft px-2 py-1 text-caption font-medium text-success">
                  {t('employees.profile.records.bank.default')}
                </span>
              ) : undefined}
              actions={canEdit && !bank.masked ? (
                <>
                  {!bank.defaultAccount ? <Button variant="secondary" size="sm" disabled={pending}
                    onClick={() => void selectDefault(bank)}>{t(`${key}.makeDefault`)}</Button> : null}
                  <Button variant="secondary" size="sm" onClick={() => setEditor(bank)} disabled={pending}
                    aria-label={t(`${key}.editNamed`, { name: bank.bankName })}>
                    <Pencil aria-hidden="true" />{t('employees.profile.edit')}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setRemoving(bank)} disabled={pending}
                    aria-label={t(`${key}.deleteNamed`, { name: bank.bankName })}>
                    <Trash2 aria-hidden="true" />{t(`${key}.delete`)}
                  </Button>
                </>
              ) : undefined}>
                <DetailList items={[
                  { label: t('employees.profile.records.bank.holder'), value: bank.accountHolder },
                  { label: t('employees.profile.records.bank.number'), value: (
                    <MaskedValue value={bank.accountNumber} revealable={!bank.masked}
                      shown={revealedId === bank.id} onToggle={() => setRevealedId(revealedId === bank.id ? null : bank.id)}
                      showLabel={t('employees.profile.records.showNumber')}
                      hideLabel={t('employees.profile.records.hideNumber')}
                      showText={t('employees.profile.identity.show')} hideText={t('employees.profile.identity.hide')}
                      emptyText={t('employees.none')} />
                  ) },
                ]} />
              </Card>
            ))}
          </div>
        )}
        {editor !== undefined ? (
          <ProfileBankFormDialog key={editor?.id ?? 'new'} open record={editor} onDirty={onDirtyChange}
            onClose={() => { onDirtyChange(false); setEditor(undefined); }} onSave={save} />
        ) : null}
        <ConfirmDialog open={removing !== null} title={t(`${key}.deleteNamed`, { name: removing?.bankName ?? '' })}
          description={t(removing?.defaultAccount ? `${key}.deleteDefaultHint` : `${key}.deleteHint`)}
          confirmLabel={t(`${key}.delete`)} pending={pending}
          onCancel={() => { if (!pending) setRemoving(null); }} onConfirm={() => void deleteAccount()} />
      </div>
    </ProfileRecordsState>
  );
}
