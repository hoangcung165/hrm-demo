// The punch import wizard's state (HRM-23): Tải lên → Kiểm tra → Xác nhận → Kết quả. The step lives in page state, not
// the URL: the file is not kept, so a reload starts again at step 1. A file is checked as soon as it is chosen.
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { isAbort, PUNCH_IMPORT_MAX_BYTES, recheckOf, useCheckPunchImport, useImportPunches, type PunchImportCheck, type PunchImportResult } from './import-api';

export type PunchImportStep = 'upload' | 'check' | 'confirm' | 'done';

/** Why step 1 shows an error: a client-side check, or the API's refusal (an `ApiError`, or a failed connection). */
export type PunchFileProblem = 'file_type' | 'file_too_large' | unknown;

const TYPES = /\.(csv|xlsx)$/i;

export function usePunchImport() {
  const { t } = useTranslation();
  const toast = useToast();
  const checking = useCheckPunchImport();
  const importing = useImportPunches();
  const [step, setStep] = useState<PunchImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [check, setCheck] = useState<PunchImportCheck | null>(null);
  const [fileProblem, setFileProblem] = useState<PunchFileProblem | null>(null);
  /** The file changed between the check and the write: step 2 says so above the new result. */
  const [changed, setChanged] = useState(false);
  const [result, setResult] = useState<PunchImportResult | null>(null);
  /** The permission was taken away meanwhile: the page shows its no-permission state. */
  const [denied, setDenied] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const refuse = (problem: PunchFileProblem) => {
    setFileProblem(problem);
    setCheck(null);
    setStep('upload');
  };

  const select = (picked: File) => {
    setFile(picked);
    setChanged(false);
    importing.reset();
    if (!TYPES.test(picked.name)) return refuse('file_type');
    if (picked.size > PUNCH_IMPORT_MAX_BYTES) return refuse('file_too_large');
    setFileProblem(null);
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    checking.mutate(
      { file: picked, signal: controller.signal },
      {
        onSuccess: (checked) => {
          if (controller.signal.aborted) return;
          setCheck(checked);
          setStep('check');
        },
        onError: (error) => {
          if (controller.signal.aborted || isAbort(error)) return;
          if (error instanceof ApiError && error.status === 403) return setDenied(true);
          refuse(error);
        },
      },
    );
  };

  /** "Hủy" while the file is checked. */
  const cancelCheck = () => {
    abort.current?.abort();
    checking.reset();
    setFile(null);
  };

  /** Back to step 1 with no file. */
  const restart = () => {
    cancelCheck();
    importing.reset();
    setCheck(null);
    setChanged(false);
    setResult(null);
    setFileProblem(null);
    setStep('upload');
  };

  const confirm = () => {
    if (!file || !check || importing.isPending) return;
    importing.mutate(
      { file, checksum: check.checksum, skipInvalid: check.summary.errorRows > 0 },
      {
        onSuccess: (done) => {
          setResult(done);
          setStep('done');
          toast({ variant: 'success', message: t('attendanceImport.toast', { n: formatNumber(done.stored), count: done.stored }), detail: t('attendanceImport.toastFrom', { fileName: check.fileName }) });
        },
        onError: (error) => {
          if (!(error instanceof ApiError)) return;
          if (error.status === 403) return setDenied(true);
          const fresh = recheckOf(error);
          if (fresh) {
            // The rows have errors now that had none at the check: show the new check.
            setChanged(true);
            setCheck({ ...check, ...fresh });
            setStep('check');
            importing.reset();
          } else if (error.code === 'import.file_changed' || error.code === 'import.nothing_to_import') {
            importing.reset();
            setFile(null);
            refuse(error);
          }
          // Anything else (5xx, connection): stay on step 3, which offers "Thử lại".
        },
      },
    );
  };

  return {
    step,
    file,
    check,
    result,
    denied,
    changed,
    fileProblem,
    checkingFile: checking.isPending,
    writing: importing.isPending,
    writeFailed: importing.isError,
    select,
    cancelCheck,
    restart,
    toConfirm: () => setStep('confirm'),
    backToCheck: () => {
      importing.reset();
      setStep('check');
    },
    confirm,
  };
}

export type PunchImport = ReturnType<typeof usePunchImport>;
