// Which day parts a request may take (the rules of the API's `spanProblems`): one day is whole, morning or
// afternoon; a longer span may start in the afternoon and end in the morning; a type without half days is whole.
import type { DayPart } from './api';

export function startParts(oneDay: boolean, halfDays: boolean): DayPart[] {
  if (!halfDays) return ['FULL'];
  return oneDay ? ['FULL', 'MORNING', 'AFTERNOON'] : ['FULL', 'AFTERNOON'];
}

export function endParts(oneDay: boolean, halfDays: boolean, startPart: DayPart): DayPart[] {
  if (oneDay) return [startPart];
  return halfDays ? ['FULL', 'MORNING'] : ['FULL'];
}
