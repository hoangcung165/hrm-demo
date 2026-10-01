Status: ready-for-agent
Type: AFK

# #30 Duyệt bảng lương nhiều cấp & khóa kỳ lương

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 71, 72, 73

## What to build

Sau Confirm, bảng lương đi qua Luồng phê duyệt nhiều cấp (ví dụ Trưởng phòng HR → Kế toán trưởng → Giám đốc). Người duyệt xem tổng quỹ lương và xem chi tiết từng người. Duyệt xong kỳ lương chuyển `Locked`. Chỉ Admin mở khóa được, có nhập lý do và ghi audit.

## Acceptance criteria

- [ ] Kỳ lương đã khóa không sửa được dữ liệu lương
- [ ] Mở khóa yêu cầu quyền Admin + lý do, có bản ghi audit
- [ ] API integration test: tính lương → duyệt 3 cấp → khóa

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Duyệt bảng lương, khóa/mở khóa kèm lý do
- **Pattern:** P7, P4 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #13 Audit log — `.scratch/hrm-02-people/issues/13-audit-log.md`
- #29 Máy tính lương & quy trình Setup → Preview → Confirm — `.scratch/hrm-06-payroll/issues/29-payroll-calculator-preview.md`
