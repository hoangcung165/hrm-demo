import { ApiError } from '@/lib/api';
import { canAddRow, chosenSkills, criteriaErrors, emptyRow, initialCriteria, serverCriteriaErrors, toQuery, type CriteriaDraft } from './candidate-criteria';

const project = { startDate: '2026-09-01', endDate: '2027-03-31' };
const draft = (change: Partial<CriteriaDraft> = {}): CriteriaDraft => ({
  rows: [{ key: 0, skillId: 'react', minLevel: 3 }],
  from: '2026-11-01',
  to: '2027-03-31',
  need: '',
  sort: 'match',
  ...change,
});

describe('initialCriteria', () => {
  it('starts from today to the end of the project, with one empty skill row', () => {
    expect(initialCriteria(project, '2026-10-18')).toEqual({ rows: [emptyRow(0)], from: '2026-10-18', to: '2027-03-31', need: '', sort: 'match' });
  });

  it('starts from the first day of a project that has not begun', () => {
    expect(initialCriteria(project, '2026-08-01').from).toBe('2026-09-01');
  });

  it('never starts after the end of a project that is over', () => {
    expect(initialCriteria(project, '2027-06-01').from).toBe('2027-03-31');
  });
});

describe('criteriaErrors', () => {
  it('has none for a range inside the project and a percent from 1 to 100', () => {
    expect(criteriaErrors(draft({ need: '100' }), project)).toEqual({});
    expect(criteriaErrors(draft({ need: ' 1 ' }), project)).toEqual({});
  });

  it('asks for both dates', () => {
    expect(criteriaErrors(draft({ from: '', to: '' }), project)).toEqual({ from: { key: 'fromRequired' }, to: { key: 'toRequired' } });
  });

  it('says the project dates when the range goes outside them', () => {
    expect(criteriaErrors(draft({ to: '2027-04-30' }), project).to).toEqual({ key: 'toAfterProject', values: { date: '2027-03-31' } });
    expect(criteriaErrors(draft({ from: '2026-08-01' }), project).from).toEqual({ key: 'fromBeforeProject', values: { date: '2026-09-01' } });
    expect(criteriaErrors(draft({ from: '2027-04-01' }), project).from).toEqual({ key: 'fromAfterProject', values: { date: '2027-03-31' } });
  });

  it('refuses an end before the start', () => {
    expect(criteriaErrors(draft({ from: '2026-12-01', to: '2026-11-01' }), project).to).toEqual({ key: 'toBeforeFrom' });
  });

  it('refuses a percent that is not a whole number from 1 to 100', () => {
    for (const need of ['0', '101', '120', '5.5', 'abc', '-3']) expect(criteriaErrors(draft({ need }), project).need).toEqual({ key: 'need' });
  });
});

describe('toQuery', () => {
  it('is the search the criteria stand for', () => {
    expect(toQuery(draft({ need: '50', sort: 'free' }), project)).toEqual({ skills: [{ skillId: 'react', minLevel: 3 }], from: '2026-11-01', to: '2027-03-31', need: 50, sort: 'free' });
  });

  it('leaves out the rows with no skill, and need is null when empty', () => {
    const query = toQuery(draft({ rows: [{ key: 0, skillId: 'react', minLevel: 3 }, emptyRow(1)] }), project);
    expect(query?.skills).toHaveLength(1);
    expect(query?.need).toBeNull();
  });

  it('is null with no skill chosen or with a field error', () => {
    expect(toQuery(draft({ rows: [emptyRow(0)] }), project)).toBeNull();
    expect(toQuery(draft({ need: '120' }), project)).toBeNull();
  });
});

describe('rows', () => {
  it('keeps the chosen skills only', () => {
    expect(chosenSkills([emptyRow(0), { key: 1, skillId: 'java', minLevel: 2 }])).toHaveLength(1);
  });

  it('adds a row only when every row has a skill and there are fewer than five', () => {
    expect(canAddRow([emptyRow(0)])).toBe(false);
    expect(canAddRow([{ key: 0, skillId: 'react', minLevel: 1 }])).toBe(true);
    expect(canAddRow([0, 1, 2, 3, 4].map((key) => ({ key, skillId: `s${key}`, minLevel: 1 })))).toBe(false);
  });
});

describe('serverCriteriaErrors', () => {
  it('maps the field errors the form has a field for', () => {
    const error = new ApiError(400, 'validation.invalid', [
      { field: 'to', code: 'outside_project' },
      { field: 'need', code: 'out_of_range' },
    ]);
    expect(serverCriteriaErrors(error)).toEqual({ to: { key: 'outsideProject' }, need: { key: 'need' } });
  });

  it('is empty for any other failure', () => {
    expect(serverCriteriaErrors(new ApiError(500, 'error.unknown'))).toEqual({});
    expect(serverCriteriaErrors(new ApiError(400, 'validation.invalid', [{ field: 'skills', code: 'too_many' }]))).toEqual({});
    expect(serverCriteriaErrors(null)).toEqual({});
  });
});
