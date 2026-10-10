// Request details as GET /api/approvals/{id} returns them, built from the inbox fixture rows: every earlier level
// approved, the row's level waiting (or ended as its status says), the log to match. The caller decides the rows of
// "Chờ tôi duyệt".
import type { ApprovalInboxItem, ApprovalLogEntry, ApprovalRequestDetail, ApprovalStep } from '@/features/approval/api';
import type { ProfileUpdate } from '@/features/profile-update/api';
import { HUNG, INBOX, MAI } from './approval-fixtures';

const STEP_STATE = { PENDING: 'WAITING', RETURNED_FOR_INFO: 'RETURNED', REJECTED: 'REJECTED', CANCELLED: 'CANCELLED', APPROVED: 'DONE' } as const;

export function detailOf(row: ApprovalInboxItem): ApprovalRequestDetail {
  const decide = INBOX.WAITING.some((waiting) => waiting.id === row.id);
  // Trần Thị Mai's own requests: she may cancel them, and send a returned one again.
  const mine = row.sender.id === MAI.id;
  const steps: ApprovalStep[] = Array.from({ length: row.levelCount }, (_, i) => {
    const level = i + 1;
    const state = level < row.level ? 'DONE' : level === row.level ? STEP_STATE[row.status] : 'NOT_REACHED';
    const decided = state !== 'WAITING' && state !== 'NOT_REACHED';
    return {
      level,
      rule: level === row.level ? row.rule : 'LINE_MANAGER',
      role: level === row.level ? row.role : null,
      state,
      approvers: state === 'WAITING' ? [MAI, { id: 'e-28', code: 'NV00028', fullName: 'Trương Thị Ngọc Hân', orgUnitName: null }] : [],
      escalated: false,
      decidedBy: decided ? HUNG : null,
      onBehalfOf: null,
      decidedAt: decided ? row.updatedAt : null,
      comment: decided ? 'Đã kiểm tra, thông tin đúng.' : null,
      autoApproved: false,
    };
  });
  const log: ApprovalLogEntry[] = [
    { event: 'SUBMITTED', level: 1, actor: row.sender, onBehalfOf: null, comment: null, escalatedTo: null, at: row.sentAt },
    { event: 'LEVEL_REACHED', level: 1, actor: null, onBehalfOf: null, comment: null, escalatedTo: null, at: row.sentAt },
  ];
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    level: row.level,
    levelCount: row.levelCount,
    summary: row.summary,
    sender: row.sender,
    sentAt: row.sentAt,
    autoApproveDays: row.autoApproveDueAt ? 3 : null,
    autoApproveDueAt: row.status === 'PENDING' ? row.autoApproveDueAt : null,
    steps,
    log,
    allowed: {
      decide: decide && row.status === 'PENDING',
      onBehalfOf: row.onBehalfOf,
      resubmit: mine && row.status === 'RETURNED_FOR_INFO',
      cancel: mine && (row.status === 'PENDING' || row.status === 'RETURNED_FOR_INFO'),
    },
  };
}

export function profileUpdateOf(row: ApprovalInboxItem): ProfileUpdate {
  return {
    id: row.id,
    status: row.status,
    employeeId: row.sender.id,
    note: 'Em vừa chuyển nhà và đổi số điện thoại.',
    changes: [
      { field: 'PHONE', oldValue: '0912345678', newValue: '0987654321' },
      { field: 'ADDRESS', oldValue: 'Số 18 ngõ 72 Tôn Thất Tùng, Hà Nội', newValue: 'Căn 1506, tòa A2, 2 Phạm Văn Bạch, Hà Nội' },
    ],
  };
}
