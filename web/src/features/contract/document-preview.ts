// Values currently available to BE-3's ContractDocxMerge (document-data preview, not a PDF render).
// Do not infer the actual template text: the server offers no preview or download endpoint.
import type { EmploymentContract } from './api';

export type ExportPreviewField = {
  key: string;
  value: string;
  missing: boolean;
};

/** Keep these keys aligned with ContractDocumentService.export's merge field map. */
export const EXPORT_KEYS = [
  'employee_name', 'employee_code', 'contract_number', 'contract_type',
  'signed_on', 'starts_on', 'ends_on', 'base_salary', 'insurance_salary',
  'insured', 'tax_method',
] as const;

const date = (iso: string | null) =>
  iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';

export function contractExportPreview(contract: EmploymentContract, employee: { fullName: string; code: string }): ExportPreviewField[] {
  const data: Record<(typeof EXPORT_KEYS)[number], string> = {
    employee_name: employee.fullName,
    employee_code: employee.code,
    contract_number: contract.contractNumber,
    contract_type: contract.contractType,
    signed_on: date(contract.signedOn),
    starts_on: date(contract.startsOn),
    ends_on: date(contract.endsOn),
    base_salary: String(contract.baseSalary),
    insurance_salary: contract.insuranceSalary === null ? '' : String(contract.insuranceSalary),
    insured: String(contract.insured),
    tax_method: contract.taxMethod,
  };
  return EXPORT_KEYS.map(key => ({
    key, value: data[key], missing: data[key].trim() === '',
  }));
}
