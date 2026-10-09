// The import wizard's state (HRM-07): Tải lên → Kiểm tra → Xác nhận → Kết quả. The step lives in page state, not the
// URL: the file is not kept, so a reload starts again at step 1. A file is checked as soon as it is chosen.
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { IMPORT_MAX_BYTES, isAbort, recheckOf, useCheckImport, useImportEmployees, type ImportCheck, type ImportResult } from './import-api';

export type ImportStep = 'upload' | 'check' | 'confirm' | 'done';

/** Why step 1 shows an error: a client-side check, or the API's refusal (an `ApiError`, or a failed connection). */
export type ImportFileProblem = 'file_type' | 'file_too_large' | unknown;

export function useEmployeeImport() {
  const { t } = useTranslation();
  const toast = useToast();
  const checking = useCheckImport();
  const importing = useImportEmployees();
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [check, setCheck] = useState<ImportCheck | null>(null);
  const [fileProblem, setFileProblem] = useState<ImportFileProblem | null>(null);
  /** Rows whose result changed when the import checked the file again (`import.rows_invalid`). */
  const [changedRows, setChangedRows] = useState<Set<number> | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  /** The permission was taken away meanwhile: the page shows its no-permission state. */
  const [denied, setDenied] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const refuse = (problem: ImportFileProblem) => {
    setFileProblem(problem);
    setCheck(null);
    setStep('upload');
  };

  const select = (picked: File) => {
    setFile(picked);
    setChangedRows(null);
    importing.reset();
    if (!picked.name.toLowerCase().endsWith('.xlsx')) return refuse('file_type');
    if (picked.size > IMPORT_MAX_BYTES) return refuse('file_too_large');
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
    setChangedRows(null);
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
          toast({ variant: 'success', message: t('employees.import.toast', { n: formatNumber(done.createdCount), count: done.createdCount }) });
        },
        onError: (error) => {
          if (!(error instanceof ApiError)) return;
          if (error.status === 403) return setDenied(true);
          const fresh = recheckOf(error);
          if (fresh) {
            // Another change came between the check and the write: show the new check and what changed.
            const before = new Map(check.rows.map((row) => [row.row, row.status]));
            setChangedRows(new Set(fresh.rows.filter((row) => before.get(row.row) !== row.status).map((row) => row.row)));
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
    changedRows,
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

export type EmployeeImport = ReturnType<typeof useEmployeeImport>;
