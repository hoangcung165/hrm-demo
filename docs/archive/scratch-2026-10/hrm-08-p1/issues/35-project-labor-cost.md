Status: ready-for-agent
Type: AFK

# #35 Chi phí nhân sự dự án (kế hoạch và thực tế)

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 43

## What to build

Tính chi phí nhân sự dự án theo 2 cách: kế hoạch = lương × % phân bổ; thực tế = lương quy giờ × giờ timesheet đã duyệt. So sánh với ngân sách nhân sự dự án, hiển thị trên dashboard dự án.

## Acceptance criteria

- [ ] Chỉ vai trò được phép (PM, Giám đốc, Kế toán) xem số tiền
- [ ] Chi phí thực tế chỉ dùng timesheet đã duyệt và lương kỳ đã khóa
- [ ] Cảnh báo khi thực tế vượt ngân sách

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Chi phí nhân sự dự án
- **Pattern:** P2, biểu đồ (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #27 Timesheet dự án & PM duyệt — `.scratch/hrm-05-time/issues/27-project-timesheet.md`
- #31 Phiếu lương & file chi lương ngân hàng — `.scratch/hrm-06-payroll/issues/31-payslip-bank-file.md`
