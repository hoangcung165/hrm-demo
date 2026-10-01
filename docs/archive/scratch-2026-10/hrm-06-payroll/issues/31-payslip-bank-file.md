Status: ready-for-agent
Type: AFK

# #31 Phiếu lương & file chi lương ngân hàng

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 74, 75, 81

## What to build

Nhân viên xem phiếu lương theo kỳ trên web/mobile và tải PDF (đầy đủ thu nhập, khấu trừ, BH, thuế, net). Kế toán xuất file chi lương Excel theo mẫu một ngân hàng (cấu hình cột) từ kỳ lương đã khóa.

## Acceptance criteria

- [ ] Nhân viên chỉ xem được phiếu lương của mình
- [ ] PDF phiếu lương khớp số liệu kỳ đã khóa
- [ ] File ngân hàng dùng tài khoản mặc định nhận lương, tổng tiền khớp tổng net
- [ ] API integration test: phiếu lương và file ngân hàng sau khi khóa

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Phiếu lương web/mobile + template PDF, xuất file ngân hàng
- **Pattern:** P8, P11 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#31 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #30 Duyệt bảng lương nhiều cấp & khóa kỳ lương — `.scratch/hrm-06-payroll/issues/30-payroll-approval-lock.md`
