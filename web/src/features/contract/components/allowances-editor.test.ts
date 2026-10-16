import { readAllowanceRows } from './allowances-editor';

describe('HRM-10 allowance row parsing', () => {
  it('accepts empty and valid data with both type and name keys', () => {
    expect(readAllowanceRows('')).toEqual([]);
    expect(readAllowanceRows('[]')).toEqual([]);
    expect(readAllowanceRows('[{"name":"Lunch","amount":500000}]')).toEqual([{ name: 'Lunch', amount: 500000 }]);
    expect(readAllowanceRows('[{"type":"Transport","amount":100000}]')).toEqual([{ name: 'Transport', amount: 100000 }]);
  });
  it('rejects invalid or negative amounts, malformed shapes, and JSON objects', () => {
    expect(readAllowanceRows('{}')).toBeNull();
    expect(readAllowanceRows('[{"name":"Lunch","amount":-1}]')).toBeNull();
    expect(readAllowanceRows('[{"amount":100000}]')).toBeNull();
    expect(readAllowanceRows('[{"name":"Lunch","amount":"500000"}]')).toBeNull();
    expect(readAllowanceRows('{bad json}')).toBeNull();
  });
});
