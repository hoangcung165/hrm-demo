// The sample file of the punch log, built in the browser (no endpoint): the header row and one example row. Saved with a
// byte order mark so Excel reads the accents, and with the columns the import reads.
import { saveFile } from '@/lib/save-file';
import type { PunchImportError } from './import-api';

const BOM = '﻿';

/** A CSV cell: quoted when it holds a comma, a quote or a line break. */
const cell = (value: string | number | null) => {
  const text = value === null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const line = (cells: Array<string | number | null>) => cells.map(cell).join(',');

export function saveTemplate() {
  const text = [line(['Mã nhân viên', 'Thời gian', 'Máy chấm công']), line(['NV00031', '13/10/2026 08:17', 'Cổng chính'])].join('\r\n');
  saveFile(new Blob([BOM, text, '\r\n'], { type: 'text/csv;charset=utf-8' }), 'mau-log-quet-the.csv');
}

/** The rows with errors as a CSV the person can filter in Excel: row, the value as written, the error and its words. */
export function saveErrorList(errors: PunchImportError[], message: (error: PunchImportError) => string, header: string[], fileName: string) {
  const rows = errors.map((error) => line([error.row, error.value ?? '', error.code, message(error)]));
  saveFile(new Blob([BOM, [line(header), ...rows].join('\r\n'), '\r\n'], { type: 'text/csv;charset=utf-8' }), fileName);
}
