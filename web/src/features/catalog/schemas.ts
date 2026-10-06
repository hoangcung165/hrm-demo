// The add/edit form of a catalog item: one shape for every catalog, validated by the catalog's own rules, the same
// as the backend's (`CatalogService.fields`). Messages are i18n keys.
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { daysInRange, formatDateRange } from '@/lib/format';
import type { CatalogItem, CatalogItemRequest, CatalogKey, ContractTerm } from './api';

export const CODE_MAX = 20;
export const NAME_MAX = 150;
export const MAX_FIXED_TERM_MONTHS = 36;
export const MAX_HOLIDAY_DAYS = 10;
export const CONTRACT_TERMS = ['INDEFINITE', 'FIXED', 'PROBATION'] as const satisfies readonly ContractTerm[];
const CODE_PATTERN = /^[A-Z0-9_-]{2,20}$/;

/** Holidays have no code; every other catalog does. */
export const hasCode = (catalog: CatalogKey) => catalog !== 'holidays';

/** Text fields hold what is typed; `maxMonths` too, so a half-typed number is not lost. Dates are ISO (`<input type="date">`). */
export type CatalogValues = {
  code: string;
  name: string;
  term: ContractTerm;
  maxMonths: string;
  insurable: boolean;
  taxable: boolean;
  startDate: string;
  endDate: string;
};

export type CatalogField = keyof CatalogValues;

export function initialValues(item: CatalogItem | null): CatalogValues {
  // A new contract type is indefinite; switched to fixed-term it offers the legal maximum.
  if (!item) return { code: '', name: '', term: 'INDEFINITE', maxMonths: String(MAX_FIXED_TERM_MONTHS), insurable: false, taxable: true, startDate: '', endDate: '' };
  return {
    code: item.code ?? '',
    name: item.name,
    term: item.term ?? 'INDEFINITE',
    maxMonths: String(item.maxMonths ?? MAX_FIXED_TERM_MONTHS),
    insurable: item.insurable ?? false,
    taxable: item.taxable ?? true,
    startDate: item.startDate ?? '',
    endDate: item.endDate ?? '',
  };
}

const base = z.object({
  // Upper-cased like the backend does before it validates and stores.
  code: z.string().trim().toUpperCase(),
  name: z.string().trim().min(1, 'catalogs.validation.nameRequired').max(NAME_MAX, 'catalogs.validation.nameTooLong'),
  term: z.enum(CONTRACT_TERMS),
  maxMonths: z.string().trim(),
  insurable: z.boolean(),
  taxable: z.boolean(),
  startDate: z.string(),
  endDate: z.string(),
});

/** The rules of one catalog; fields the catalog does not take are not checked. */
export function catalogSchema(catalog: CatalogKey) {
  return base.superRefine((values, ctx) => {
    const fail = (field: CatalogField, message: string) => ctx.addIssue({ code: 'custom', path: [field], message });
    if (hasCode(catalog)) {
      if (!values.code) fail('code', 'catalogs.validation.codeRequired');
      else if (!CODE_PATTERN.test(values.code)) fail('code', 'catalogs.validation.code');
    }
    if (catalog === 'contract-types' && values.term === 'FIXED') {
      const months = Number(values.maxMonths);
      if (!/^\d+$/.test(values.maxMonths) || months < 1 || months > MAX_FIXED_TERM_MONTHS) fail('maxMonths', 'catalogs.validation.maxMonths');
    }
    if (catalog === 'holidays') {
      if (!values.startDate) fail('startDate', 'catalogs.validation.startDateRequired');
      if (!values.endDate) fail('endDate', 'catalogs.validation.endDateRequired');
      else if (values.startDate && values.endDate < values.startDate) fail('endDate', 'catalogs.validation.endBeforeStart');
      else if (values.startDate && daysInRange(values.startDate, values.endDate) > MAX_HOLIDAY_DAYS) fail('endDate', 'catalogs.validation.tooManyDays');
    }
  });
}

/** What the API gets: the fields of this catalog, the others null. Takes values zod has already trimmed. */
export function toRequest(catalog: CatalogKey, values: CatalogValues): CatalogItemRequest {
  const contract = catalog === 'contract-types';
  const allowance = catalog === 'allowance-types';
  const holiday = catalog === 'holidays';
  return {
    code: hasCode(catalog) ? values.code.trim().toUpperCase() : null,
    name: values.name.trim(),
    term: contract ? values.term : null,
    maxMonths: contract && values.term === 'FIXED' ? Number(values.maxMonths) : null,
    insurable: allowance ? values.insurable : null,
    taxable: allowance ? values.taxable : null,
    startDate: holiday ? values.startDate : null,
    endDate: holiday ? values.endDate : null,
  };
}

/** Edit: whether the form would send anything other than the item has. */
export function catalogChanged(catalog: CatalogKey, values: CatalogValues, item: CatalogItem): boolean {
  const now = toRequest(catalog, values);
  const before = toRequest(catalog, initialValues(item));
  return (Object.keys(now) as Array<keyof CatalogItemRequest>).some((key) => now[key] !== before[key]);
}

/** A server error shown under a field: an i18n key and the values for its placeholders. */
export type CatalogFieldError = { field: CatalogField; message: string; values?: Record<string, string> };

const FIELDS: CatalogField[] = ['code', 'name', 'term', 'maxMonths', 'insurable', 'taxable', 'startDate', 'endDate'];

// Backend `validation.invalid` errors name the field only ("Invalid"); the zod messages say the rule.
const BACKEND_MESSAGES: Partial<Record<CatalogField, string>> = {
  code: 'catalogs.validation.code',
  name: 'catalogs.validation.nameRequired',
  maxMonths: 'catalogs.validation.maxMonths',
  startDate: 'catalogs.validation.startDateRequired',
  endDate: 'catalogs.validation.tooManyDays',
};

const text = (value: unknown) => (typeof value === 'string' && value ? value : null);

/** The field errors a failed save maps to, in form order so the first can take focus; empty when it is not about a field. */
export function catalogFieldErrors(error: unknown): CatalogFieldError[] {
  if (!(error instanceof ApiError)) return [];
  switch (error.code) {
    case 'catalog.code_taken':
      return [{ field: 'code', message: 'error.catalog.code_taken' }];
    case 'catalog.name_taken': {
      const holder = text(error.details.holderName);
      return [holder ? { field: 'name', message: 'catalogs.form.nameTakenBy', values: { name: holder } } : { field: 'name', message: 'error.catalog.name_taken' }];
    }
    case 'catalog.holiday_overlap': {
      const name = text(error.details.holidayName);
      const start = text(error.details.holidayStartDate);
      const end = text(error.details.holidayEndDate);
      if (!name) return [{ field: 'endDate', message: 'error.catalog.holiday_overlap' }];
      const dates = start && end ? formatDateRange(start, end) : '';
      return [{ field: 'endDate', message: dates ? 'catalogs.form.overlapWith' : 'catalogs.form.overlapWithName', values: { name, dates } }];
    }
    case 'validation.invalid':
      return FIELDS.flatMap((field) =>
        error.fieldErrors.some((candidate) => candidate.field === field) ? [{ field, message: BACKEND_MESSAGES[field] ?? 'error.validation.invalid' }] : [],
      );
    default:
      return [];
  }
}
