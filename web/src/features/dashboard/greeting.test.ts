import { greetingName, greetingPeriod } from './greeting';

describe('greeting', () => {
  it('changes at noon and at six in the evening', () => {
    expect([0, 11, 12, 17, 18, 23].map(greetingPeriod)).toEqual(['morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening']);
  });

  it('greets by the given name, the last word of the full name', () => {
    expect(greetingName('Trần Thị Mai')).toBe('Mai');
    expect(greetingName('  Quản trị viên ')).toBe('viên');
    expect(greetingName('')).toBe('');
  });
});
