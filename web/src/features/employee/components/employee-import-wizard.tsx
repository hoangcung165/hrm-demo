// The import wizard (pattern P5): the Steps, then the current step. Leaving while a check result is on screen asks
// first; nothing has been written then.
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UnsavedChangesGuard } from '@/components/layout/unsaved-changes-guard';
import { Steps } from '@/components/ui/steps';
import type { EmployeeImport } from '../use-employee-import';
import { ImportCheckStep } from './import-check-step';
import { ImportConfirmStep } from './import-confirm-step';
import { ImportResultBlock } from './import-result';
import { ImportUploadStep } from './import-upload-step';

const STEP_INDEX = { upload: 0, check: 1, confirm: 2, done: 2 } as const;

export function EmployeeImportWizard({ wizard }: { wizard: EmployeeImport }) {
  const { t } = useTranslation();
  const { step, check } = wizard;
  // A check with something to import would be lost. During a write only the browser's own prompt applies.
  const guard = (step === 'check' || step === 'confirm') && !wizard.writing && (check?.summary.validRows ?? 0) > 0;
  const { writing } = wizard;
  useEffect(() => {
    if (!writing) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [writing]);
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Steps
        steps={[{ label: t('employees.import.steps.upload') }, { label: t('employees.import.steps.check') }, { label: t('employees.import.steps.confirm') }]}
        current={STEP_INDEX[step]}
        complete={step === 'done'}
      />
      {step === 'upload' ? <ImportUploadStep wizard={wizard} /> : null}
      {step === 'check' ? <ImportCheckStep wizard={wizard} /> : null}
      {step === 'confirm' ? <ImportConfirmStep wizard={wizard} /> : null}
      {step === 'done' && wizard.result ? <ImportResultBlock result={wizard.result} onAnother={wizard.restart} /> : null}
      <UnsavedChangesGuard
        when={guard}
        title={t('employees.import.leave.title')}
        description={t('employees.import.leave.text', { fileName: check?.fileName ?? '' })}
        confirmLabel={t('employees.import.leave.confirm')}
        cancelLabel={t('employees.import.leave.stay')}
      />
    </div>
  );
}
