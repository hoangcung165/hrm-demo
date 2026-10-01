Status: ready-for-agent
Type: AFK

# #37 Commission

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 76

## What to build

Nhập commission theo nhân viên theo kỳ, tách riêng khỏi lương nhưng thuế TNCN được tính trên tổng thu nhập; phần thuế phát sinh trên commission được trừ vào kỳ chi commission; phiếu và file chi commission riêng.

## Acceptance criteria

- [ ] Thuế trên tổng thu nhập khớp tính tay
- [ ] Unit test Máy tính lương: có commission trong kỳ

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Commission
- **Pattern:** P2, P4 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #31 Phiếu lương & file chi lương ngân hàng — `.scratch/hrm-06-payroll/issues/31-payslip-bank-file.md`
