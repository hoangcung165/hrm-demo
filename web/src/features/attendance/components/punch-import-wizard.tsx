// The punch import wizard (pattern P5): the Steps, then the current step. Leaving while a check result is on screen asks
// first; nothing has been written then.
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UnsavedChangesGuard } from '@/components/layout/unsaved-changes-guard';
import { Steps } from '@/components/ui/steps';
import type { PunchImport } from '../use-punch-import';
import { PunchCheckStep } from './punch-check-step';
import { PunchConfirmStep } from './punch-confirm-step';
import { PunchImportResultBlock } from './punch-import-result';
import { PunchUploadStep } from './punch-upload-step';

const STEP_INDEX = { upload: 0, check: 1, confirm: 2, done: 2 } as const;

export function PunchImportWizard({ wizard }: { wizard: PunchImport }) {
  const { t } = useTranslation();
  const { step, check, writing } = wizard;
  // A check with something to import would be lost. During a write only the browser's own prompt applies.
  const guard = (step === 'check' || step === 'confirm') && !writing && (check?.summary.newPunches ?? 0) > 0;
  useEffect(() => {
    if (!writing) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [writing]);
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Steps
        steps={[{ label: t('attendanceImport.steps.upload') }, { label: t('attendanceImport.steps.check') }, { label: t('attendanceImport.steps.confirm') }]}
        current={STEP_INDEX[step]}
        complete={step === 'done'}
      />
      {step === 'upload' ? <PunchUploadStep wizard={wizard} /> : null}
      {step === 'check' ? <PunchCheckStep wizard={wizard} /> : null}
      {step === 'confirm' ? <PunchConfirmStep wizard={wizard} /> : null}
      {step === 'done' && wizard.result && check ? <PunchImportResultBlock result={wizard.result} summary={check.summary} onAnother={wizard.restart} /> : null}
      <UnsavedChangesGuard
        when={guard}
        title={t('attendanceImport.leave.title')}
        description={t('attendanceImport.leave.text', { fileName: check?.fileName ?? '' })}
        confirmLabel={t('attendanceImport.leave.confirm')}
        cancelLabel={t('attendanceImport.leave.stay')}
      />
    </div>
  );
}
