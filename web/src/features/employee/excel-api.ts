// Excel files of Employees (HRM-07): the export of the list and the import template. Contract: "## API contract"
// on issue #9. The server names the file (`Content-Disposition`) and counts its rows (`X-Total-Count`).
import { useMutation } from '@tanstack/react-query';
import { ApiError, apiDownload } from '@/lib/api';
import { saveFile } from '@/lib/save-file';
import { employeesExportPath, type EmployeeListQuery } from './api';

/** A file that was saved: its name and how many Employees it holds. */
export type SavedSheet = { fileName: string; total: number };

/** `export.too_many_rows`: the filter matches more Employees than one export may hold. */
export type TooManyRows = { limit: number; total: number };

export function tooManyRows(error: unknown): TooManyRows | null {
  if (!(error instanceof ApiError) || error.code !== 'export.too_many_rows') return null;
  const { limit, total } = error.details;
  return typeof limit === 'number' && typeof total === 'number' ? { limit, total } : null;
}

async function download(path: string, fallbackName: string): Promise<SavedSheet> {
  const file = await apiDownload(path);
  const fileName = file.fileName ?? fallbackName;
  saveFile(file.blob, fileName);
  return { fileName, total: Number(file.headers.get('X-Total-Count') ?? 0) };
}

/** Exports the list as it is filtered and ordered (the page is ignored) and saves the file. Needs EMPLOYEE_VIEW. */
export function useExportEmployees() {
  return useMutation({ mutationFn: (query: EmployeeListQuery) => download(employeesExportPath(query), 'nhan-vien.xlsx') });
}

/** Saves the import template, with the units and positions the caller may use. Needs EMPLOYEE_EDIT. */
export function useDownloadImportTemplate() {
  return useMutation({ mutationFn: () => download('/api/employees/import/template', 'mau-nhap-nhan-vien.xlsx') });
}
