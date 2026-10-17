import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FilePlus2, LogOut, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { employeeContractsKey, useEmployeeContracts } from '@/features/contract/api';
import { ContractFormDialog } from '@/features/contract/components/contract-form-dialog';
import { createContract } from '@/features/contract/write';
import type { EmployeeProfile } from '../api';
import { EMPLOYEES_KEY } from '../api';
import { profileRecordsKey } from '../profile-records-api';
import { createDecision, createEvaluation, createResignation, probationKey, useProbationEvaluations } from '../work-history-write';
import { ProbationEvaluationDialog } from './probation-evaluation-dialog';
import { ResignationDialog } from './resignation-dialog';
import { WorkDecisionDialog } from './work-decision-dialog';

type Action = 'decision' | 'probation' | 'resignation' | 'contract' | null;

export function WorkHistoryActions({ employee, canEdit, canReadSensitive, onDirty }: {
  employee: EmployeeProfile; canEdit: boolean; canReadSensitive: boolean; onDirty: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const k = 'employees.profile.history.actions';
  const cache = useQueryClient();
  const toast = useToast();
  const [action, setAction] = useState<Action>(null);
  const contracts = useEmployeeContracts(employee.id, canReadSensitive);
  const evaluations = useProbationEvaluations(employee.id, canReadSensitive);
  const suggestion = evaluations.data?.find(e => e.formalContractSuggestion)?.formalContractSuggestion;
  const formalExists = contracts.data?.some(c => c.contractType === 'INDEFINITE' && c.startsOn === suggestion?.startsOn);
  const refresh = async (profile = false) => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: profileRecordsKey(employee.id, 'work-history') }),
      cache.invalidateQueries({ queryKey: probationKey(employee.id) }),
      ...(profile ? [cache.invalidateQueries({ queryKey: EMPLOYEES_KEY })] : []),
    ]);
  };
  const done = (message: string) => toast({ variant: 'success', message: t(`${k}.${message}`) });
  return <>
    {canEdit && employee.status !== 'INACTIVE' ? <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => setAction('decision')}><Award aria-hidden="true" />{t(`${k}.decision`)}</Button>
      {canReadSensitive ? <Button variant="secondary" onClick={() => setAction('probation')}>
        <FilePlus2 aria-hidden="true" />{t(`${k}.evaluation`)}</Button> : null}
      <Button variant="secondary" onClick={() => setAction('resignation')}><LogOut aria-hidden="true" />{t(`${k}.resignation`)}</Button>
    </div> : null}
    {canReadSensitive && suggestion && !formalExists ? <Card title={t(`${k}.suggestionTitle`)}>
      <Alert variant="info" title={t(`${k}.suggestionSource`, { number: contracts.data?.find(c => c.id === suggestion.sourceContractId)?.contractNumber ?? suggestion.sourceContractId })}>
        {t(`${k}.suggestionHelp`, { date: suggestion.startsOn })}
      </Alert>
      {canEdit && employee.status !== 'INACTIVE' ? <Button className="self-start" onClick={() => setAction('contract')}>
        <FilePlus2 aria-hidden="true" />{t(`${k}.createFormalContract`)}</Button> : null}
    </Card> : null}
    {action === 'decision' ? <WorkDecisionDialog employee={employee} canEditPay={canReadSensitive}
      onDirty={onDirty} onClose={() => setAction(null)}
      onSave={async body => { await createDecision(employee.id, body); await refresh(body.kind === 'TRANSFER' || body.kind === 'PROMOTION'); done('decisionSaved'); }} /> : null}
    {action === 'probation' ? <ProbationEvaluationDialog contracts={contracts.data ?? []} manager={employee.job.manager}
      onDirty={onDirty} onClose={() => setAction(null)} onSave={async body => {
        await createEvaluation(employee.id, body); await refresh(); done('evaluationSaved');
      }} /> : null}
    {action === 'resignation' ? <ResignationDialog name={employee.fullName} hireDate={employee.job.hireDate}
      onDirty={onDirty} onClose={() => setAction(null)} onSave={async body => {
        await createResignation(employee.id, body); await refresh(true); done('resignationSaved');
      }} /> : null}
    {action === 'contract' && suggestion ? <ContractFormDialog key={suggestion.sourceContractId} contract={null}
      contracts={contracts.data ?? []} prefill={{ ...suggestion, contractNumber: '', signedOn: '' }}
      onDirty={onDirty} onClose={() => setAction(null)} onSave={async body => {
        await createContract(employee.id, body);
        await cache.invalidateQueries({ queryKey: employeeContractsKey(employee.id) });
        done('formalSaved');
      }} /> : null}
  </>;
}
