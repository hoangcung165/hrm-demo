// State of the "Tạo đơn nghỉ" / "Sửa đơn" form: the type, the days and their parts, the reason, the people copied
// and the files; the payload the check and the send take, once a type and both dates are there. Choosing the first
// day fills an empty or earlier last day; a part the span no longer allows goes back to "Cả ngày".
import { useState } from 'react';
import type { EmployeeCard } from '@/features/approval/api';
import type { DayPart, LeaveAttachment, LeaveRequestDetail } from './api';
import { endParts, startParts } from './leave-parts';
import type { LeaveRequestPayload } from './request-api';

export const REASON_MAX = 500;
export const CC_MAX = 10;
export const FILES_MAX = 5;

export type LeaveFormValues = {
  leaveTypeId: string;
  startDate: string;
  startPart: DayPart;
  endDate: string;
  endPart: DayPart;
  reason: string;
  cc: EmployeeCard[];
  files: LeaveAttachment[];
};

const EMPTY: LeaveFormValues = { leaveTypeId: '', startDate: '', startPart: 'FULL', endDate: '', endPart: 'FULL', reason: '', cc: [], files: [] };

export function valuesOf(request: LeaveRequestDetail): LeaveFormValues {
  return {
    leaveTypeId: request.leaveType.id,
    startDate: request.startDate,
    startPart: request.startPart,
    endDate: request.endDate,
    endPart: request.endPart,
    reason: request.reason ?? '',
    cc: request.cc,
    files: request.attachments,
  };
}

/** `halfDays`: whether the chosen type allows half days, from its policy. */
export function useLeaveForm(initial: LeaveFormValues | null, halfDaysOf: (typeId: string) => boolean) {
  const [values, setValues] = useState<LeaveFormValues>(initial ?? EMPTY);
  const oneDay = !values.endDate || values.startDate === values.endDate;
  const halfDays = values.leaveTypeId ? halfDaysOf(values.leaveTypeId) : true;

  /** Keeps the parts within what the type and the span allow. */
  const fit = (next: LeaveFormValues): LeaveFormValues => {
    const single = !next.endDate || next.startDate === next.endDate;
    const half = next.leaveTypeId ? halfDaysOf(next.leaveTypeId) : true;
    const startPart = startParts(single, half).includes(next.startPart) ? next.startPart : 'FULL';
    const ends = endParts(single, half, startPart);
    return { ...next, startPart, endPart: ends.includes(next.endPart) ? next.endPart : ends[0]! };
  };
  const update = (patch: Partial<LeaveFormValues>) => setValues((current) => fit({ ...current, ...patch }));

  const payload: LeaveRequestPayload | null =
    values.leaveTypeId && values.startDate && values.endDate
      ? {
          leaveTypeId: values.leaveTypeId,
          startDate: values.startDate,
          startPart: values.startPart,
          endDate: values.endDate,
          endPart: values.endPart,
          reason: values.reason.trim() || null,
          cc: values.cc.map((person) => person.id),
          attachmentIds: values.files.map((file) => file.id),
        }
      : null;

  return {
    values,
    payload,
    startOptions: startParts(oneDay, halfDays),
    endOptions: endParts(oneDay, halfDays, values.startPart),
    setType: (leaveTypeId: string) => update({ leaveTypeId }),
    setStartDate: (startDate: string) =>
      setValues((current) => fit({ ...current, startDate, endDate: !current.endDate || (startDate && current.endDate < startDate) ? startDate : current.endDate })),
    setStartPart: (startPart: DayPart) => update({ startPart }),
    setEndDate: (endDate: string) => update({ endDate }),
    setEndPart: (endPart: DayPart) => update({ endPart }),
    setReason: (reason: string) => update({ reason }),
    addCc: (person: EmployeeCard) => setValues((current) => (current.cc.some((each) => each.id === person.id) ? current : { ...current, cc: [...current.cc, person] })),
    removeCc: (id: string) => setValues((current) => ({ ...current, cc: current.cc.filter((each) => each.id !== id) })),
    addFile: (file: LeaveAttachment) => setValues((current) => ({ ...current, files: [...current.files, file] })),
    removeFile: (id: string) => setValues((current) => ({ ...current, files: current.files.filter((each) => each.id !== id) })),
  };
}

export type LeaveForm = ReturnType<typeof useLeaveForm>;
