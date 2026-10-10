// Inbox rows as GET /api/approvals returns them: the six of the artboard `#12 Hộp thư duyệt` waiting for Trần Thị
// Mai (HR), her own requests and the ones she handled. Times are relative to now, so "Còn n ngày" stays true.
import type { ApprovalBox, ApprovalInboxItem, EmployeeCard } from '@/features/approval/api';

const DAY = 24 * 60 * 60 * 1000;
const at = (days: number, hour = 9) => {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, 12, 0, 0);
  return date.toISOString();
};

export const approvalId = (n: number) => `00000000-0000-4000-b000-${String(n).padStart(12, '0')}`;
const card = (n: number, fullName: string, orgUnitName: string | null): EmployeeCard => ({ id: `e-${n}`, code: `NV000${n}`, fullName, orgUnitName });

export const AN = card(21, 'Nguyễn Văn An', 'Nhóm Web');
export const MAI = card(11, 'Trần Thị Mai', 'Phòng Hành chính - Nhân sự');
export const BAO = card(1, 'Phạm Quốc Bảo', null);
export const HUNG = card(12, 'Lê Văn Hùng', 'Nhóm Web');

const row = (n: number, overrides: Partial<ApprovalInboxItem>): ApprovalInboxItem => ({
  id: approvalId(n),
  type: 'PROFILE_UPDATE',
  status: 'PENDING',
  level: 2,
  levelCount: 2,
  rule: 'ROLE',
  role: 'HR',
  summary: 'Số điện thoại, địa chỉ',
  sender: AN,
  sentAt: at(-2),
  autoApproveDueAt: at(1),
  onBehalfOf: null,
  resubmitted: false,
  updatedAt: at(-2),
  ...overrides,
});

export const INBOX: Record<ApprovalBox, ApprovalInboxItem[]> = {
  WAITING: [
    row(1, { summary: 'Số điện thoại, địa chỉ, người liên hệ khẩn cấp' }),
    row(2, { type: 'LEAVE', level: 1, levelCount: 1, rule: 'LINE_MANAGER', role: null, summary: '13/10–14/10/2026 · 2 ngày', sender: card(2, 'Nguyễn Văn Khoa', 'Phòng Phát triển phần mềm'), autoApproveDueAt: at(2), onBehalfOf: BAO }),
    row(3, { summary: 'Email, địa chỉ', sender: card(22, 'Mạc Thị Quỳnh', 'Nhóm Web'), autoApproveDueAt: at(2) }),
    row(4, { summary: 'Người liên hệ khẩn cấp', sender: card(31, 'Cao Minh Trí', 'Nhóm Web'), autoApproveDueAt: at(3), resubmitted: true }),
    row(5, { type: 'OVERTIME', level: 1, levelCount: 1, rule: 'LINE_MANAGER', role: null, summary: 'Tăng ca 12/10 18:00–21:00', sender: card(32, 'Đỗ Thành Trung', 'Nhóm Web'), autoApproveDueAt: null }),
  ],
  SENT: [
    row(11, { sender: MAI, summary: 'Địa chỉ', level: 1, rule: 'LINE_MANAGER', role: null, status: 'RETURNED_FOR_INFO', autoApproveDueAt: null, updatedAt: at(-1) }),
    row(12, { sender: MAI, summary: 'Email cá nhân', status: 'APPROVED', autoApproveDueAt: null, sentAt: at(-20), updatedAt: at(-18) }),
  ],
  HANDLED: [row(21, { sender: HUNG, summary: 'Số điện thoại', status: 'REJECTED', autoApproveDueAt: null, sentAt: at(-6), updatedAt: at(-5) })],
};
