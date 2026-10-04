import { cn } from './utils';

describe('cn', () => {
  it('keeps a text colour next to an HRM text style', () => {
    expect(cn('text-body', 'text-on-brand')).toBe('text-body text-on-brand');
    expect(cn('text-caption', 'text-success')).toBe('text-caption text-success');
  });

  it('still lets a later text style replace an earlier one', () => {
    expect(cn('text-body', 'text-caption')).toBe('text-caption');
  });
});
