export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

/** Morning until 11:59, afternoon until 17:59, evening after, on the company's clock. */
export function greetingPeriod(hour: number): GreetingPeriod {
  if (hour < 12) return 'morning';
  return hour < 18 ? 'afternoon' : 'evening';
}

/** The name people are greeted by: the last word of the full name (the given name in Vietnamese). */
export function greetingName(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  return words[words.length - 1] ?? '';
}
