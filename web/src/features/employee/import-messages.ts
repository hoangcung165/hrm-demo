// The texts of an import: a cell error as "{message}" (reusing the form's `employees.create.error.*` copy wherever a
// field rule exists, so the form and the import say the same thing), and a refused file.
import type { TFunction } from 'i18next';
import { ApiError } from '@/lib/api';
import { formatFileSize, formatNumber } from '@/lib/format';
import type { ImportCellError } from './import-api';

const FORM = 'employees.create.error.';
const IMPORT = 'employees.import.error.';

/** `field:code` → a key of the form's copy (`FORM`) or of the import's own (`IMPORT`). */
const MESSAGES: Record<string, string> = {
  'fullName:required': `${FORM}fullNameRequired`,
  'fullName:too_long': `${FORM}fullNameTooLong`,
  'personal.dateOfBirth:required': `${FORM}dateOfBirthRequired`,
  'personal.dateOfBirth:out_of_range': `${FORM}dateOfBirthRange`,
  'personal.dateOfBirth:under_age': `${FORM}underAge`,
  'personal.gender:required': `${FORM}genderRequired`,
  'personal.gender:invalid': `${IMPORT}gender`,
  'personal.phone:invalid': `${FORM}phoneInvalid`,
  'personal.personalEmail:invalid': `${FORM}emailInvalid`,
  'personal.address:too_long': `${FORM}addressTooLong`,
  'identity.idNumber:required': `${FORM}idNumberRequired`,
  'identity.idNumber:invalid': `${FORM}idNumberInvalid`,
  'identity.idIssueDate:out_of_range': `${FORM}idIssueDateRange`,
  'identity.idIssuePlace:too_long': `${FORM}idIssuePlaceTooLong`,
  'identity.taxCode:invalid': `${FORM}taxCodeInvalid`,
  'identity.taxCode:not_id_number': `${FORM}taxCodeNotIdNumber`,
  'identity.socialInsuranceNumber:invalid': `${FORM}insuranceInvalid`,
  'identity.socialInsuranceNumber:not_id_number': `${FORM}insuranceNotIdNumber`,
  'job.orgUnitId:required': `${IMPORT}unitRequired`,
  'job.orgUnitId:not_found': `${IMPORT}unitNotFound`,
  'job.orgUnitId:inactive': `${FORM}org_unit_inactive`,
  'job.orgUnitId:out_of_scope': `${IMPORT}unitOutOfScope`,
  'job.positionId:required': `${IMPORT}positionRequired`,
  'job.positionId:not_found': `${IMPORT}positionNotFound`,
  'job.positionId:inactive': `${FORM}position_inactive`,
  'job.managerId:not_found': `${IMPORT}managerNotFound`,
  'job.managerId:inactive': `${IMPORT}managerInactive`,
  'job.hireDate:required': `${FORM}hireDateRequired`,
  'job.hireDate:out_of_range': `${FORM}hireDateRange`,
  'job.hireDate:under_age': `${FORM}underAge`,
  'job.status:invalid': `${IMPORT}status`,
  'code:not_found': `${IMPORT}codeNotFound`,
};

/** The date columns: a cell that is not a date is "invalid". */
const DATES = new Set(['personal.dateOfBirth', 'identity.idIssueDate', 'job.hireDate']);
/** The numbers whose holder `taken` names, as the form's `*_taken` messages call them. */
const TAKEN: Record<string, string> = { 'identity.idNumber': 'id_number_taken', 'identity.taxCode': 'tax_code_taken', 'identity.socialInsuranceNumber': 'social_insurance_number_taken' };

/** "Đã nghỉ việc" in any case and with or without accents. */
const LEFT = /^da nghi viec$/;
const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();

/** The message of one failing cell, without its column and value. */
export function importCellMessage(error: ImportCellError, t: TFunction): string {
  const { field, code, value } = error;
  if (code === 'scientific_notation') return t(`${IMPORT}scientific`);
  if (code === 'duplicate_in_file') {
    return t(`${IMPORT}duplicate`, { header: error.header, rows: (error.otherRows ?? []).map(String).join(', '), count: error.otherRows?.length ?? 1 });
  }
  if (code === 'taken' && TAKEN[field]) {
    const holder = error.conflict;
    return holder ? t(`${FORM}${TAKEN[field]}`, { name: holder.fullName, code: holder.code }) : t(`${FORM}${TAKEN[field]}_other`);
  }
  if (code === 'invalid' && DATES.has(field)) return t(`${IMPORT}date`);
  if (field === 'job.status' && code === 'invalid' && value && LEFT.test(plain(value))) return t(`${IMPORT}statusLeft`);
  const key = MESSAGES[`${field}:${code}`];
  return key ? t(key, { value: value ?? '' }) : t(`${FORM}invalid`);
}

/** Why a file was refused before or by the check: a client-side code (`file_type`, `file_too_large`) or the API's. */
export function importFileMessage(error: unknown, file: File | null, t: TFunction): string {
  const size = file ? formatFileSize(file.size) : '';
  if (error === 'file_type') return t(`${IMPORT}fileType`, { fileName: file?.name ?? '' });
  if (error === 'file_too_large') return t(`${IMPORT}fileTooLarge`, { size });
  if (!(error instanceof ApiError)) return t(`${IMPORT}checkFailed`);
  const details = error.details;
  switch (error.code) {
    case 'import.file_too_large':
      return t(`${IMPORT}fileTooLarge`, { size });
    case 'import.too_many_rows':
      return t(`${IMPORT}tooManyRows`, { n: formatNumber(Number(details.found ?? 0)), limit: formatNumber(Number(details.limit ?? 1000)) });
    case 'import.headers_invalid': {
      const missing = Array.isArray(details.missing) ? (details.missing as string[]) : [];
      const found = Array.isArray(details.found) ? (details.found as string[]) : [];
      return missing.length > 0 && found.length > 0 ? t(`${IMPORT}wrongTemplate`, { headers: missing.join(', ') }) : t(`${IMPORT}sheetMissing`);
    }
    case 'import.empty':
      return t(`${IMPORT}empty`);
    case 'import.file_invalid':
    case 'import.file_missing':
      return t(`${IMPORT}unreadable`);
    case 'import.file_changed':
      return t(`${IMPORT}fileChanged`);
    case 'import.nothing_to_import':
      return t(`${IMPORT}nothingLeft`);
    default:
      return t(`${IMPORT}checkFailed`);
  }
}
