// Shifts as the API returns them (BE-1 of HRM-22): a day shift with a lunch break, a morning shift, and a night shift
// that crosses midnight; one more turned off.
import type { Shift } from '@/features/shift/api';

const shift = (fields: Partial<Shift> & Pick<Shift, 'id' | 'code' | 'name' | 'startTime' | 'endTime'>): Shift => ({
  breakStart: null,
  breakEnd: null,
  lateToleranceMinutes: 0,
  earlyToleranceMinutes: 0,
  roundingMode: 'NONE',
  roundingMinutes: null,
  active: true,
  crossesMidnight: false,
  scheduledMinutes: 0,
  nightMinutes: 0,
  ...fields,
});

export const HANH_CHINH = shift({
  id: '00000000-0000-4000-d000-000000000001',
  code: 'HC',
  name: 'Hành chính',
  startTime: '08:00',
  endTime: '17:00',
  breakStart: '12:00',
  breakEnd: '13:00',
  lateToleranceMinutes: 5,
  earlyToleranceMinutes: 5,
  roundingMode: 'NEAREST',
  roundingMinutes: 15,
  scheduledMinutes: 480,
});

export const CA_SANG = shift({
  id: '00000000-0000-4000-d000-000000000002',
  code: 'SANG',
  name: 'Ca sáng',
  startTime: '06:00',
  endTime: '14:00',
  scheduledMinutes: 480,
});

export const CA_DEM = shift({
  id: '00000000-0000-4000-d000-000000000003',
  code: 'DEM',
  name: 'Ca đêm',
  startTime: '22:00',
  endTime: '06:00',
  crossesMidnight: true,
  scheduledMinutes: 480,
  nightMinutes: 480,
});

export const CA_CU = shift({
  id: '00000000-0000-4000-d000-000000000004',
  code: 'CU',
  name: 'Ca cũ',
  startTime: '07:30',
  endTime: '16:30',
  breakStart: '11:30',
  breakEnd: '12:30',
  scheduledMinutes: 480,
  active: false,
});

export const SHIFTS: Shift[] = [CA_SANG, HANH_CHINH, CA_DEM, CA_CU];
