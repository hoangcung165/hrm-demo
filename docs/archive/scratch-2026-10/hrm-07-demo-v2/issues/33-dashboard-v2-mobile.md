Status: ready-for-agent
Type: AFK

# #33 Dashboard v2 & tối ưu self-service trên mobile

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 80, 82, 83

## What to build

Bổ sung dashboard: xu hướng quỹ lương theo tháng, OT, utilization theo thời gian. Rà soát và tối ưu toàn bộ màn hình self-service (hồ sơ, dự án của tôi, timesheet, lịch công, xin nghỉ/OT, phiếu lương) trên trình duyệt điện thoại.

## Acceptance criteria

- [ ] Biểu đồ quỹ lương lấy từ các kỳ đã khóa
- [ ] Các màn hình self-service dùng tốt ở chiều rộng 375px, không cuộn ngang
- [ ] Luồng xin nghỉ và xem phiếu lương thao tác được hoàn toàn trên mobile

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Dashboard v2, rà soát toàn bộ mobile
- **Pattern:** P11, biểu đồ (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#33 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #31 Phiếu lương & file chi lương ngân hàng — `.scratch/hrm-06-payroll/issues/31-payslip-bank-file.md`
