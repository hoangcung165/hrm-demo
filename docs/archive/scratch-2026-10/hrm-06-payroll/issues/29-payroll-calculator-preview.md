Status: ready-for-agent
Type: AFK

# #29 Máy tính lương & quy trình Setup → Preview → Confirm

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 66, 67, 68, 69, 70

## What to build

Xây module thuần **Máy tính lương**: nhận hồ sơ lương, bảng công đã khóa, người phụ thuộc, tham số có hiệu lực và điều chỉnh của kỳ; trả dòng lương chi tiết (từng khoản thu nhập/khấu trừ, gross, BH phần NLĐ và DN, thu nhập chịu thuế, giảm trừ, thuế TNCN, net) và cảnh báo. HR tạo kỳ lương (chỉ trên kỳ công đã khóa), chạy Setup → Preview (bảng tổng hợp, xem chi tiết từng người, cảnh báo bất thường: net ≤ 0, chênh lệch lớn so với tháng trước, thiếu tài khoản ngân hàng) → Confirm.

## Acceptance criteria

- [ ] Không tạo được kỳ lương khi kỳ công chưa khóa
- [ ] Preview hiển thị breakdown từng người khớp với tính tay
- [ ] Chạy lại Preview sau khi sửa dữ liệu cho kết quả mới, không nhân đôi
- [ ] Thay đổi lương/phụ cấp giữa kỳ được tính theo Đoạn hiệu lực; người vào/nghỉ giữa kỳ dùng Công chuẩn đầy đủ; BH theo Lương đóng BH cuối kỳ, không đóng khi nghỉ từ 14 ngày làm việc trở lên; thuế tính trên tổng cả kỳ
- [ ] Unit test module (table-driven, ví dụ tính tay): chuyển từ thử việc sang chính thức giữa kỳ (BH đủ tháng theo cuối kỳ, thuế 10% và lũy tiến theo từng đoạn), HĐ thử việc riêng không đóng BH, tăng lương giữa kỳ, vào làm giữa kỳ, nghỉ việc giữa kỳ, nghỉ không lương ≥ 14 ngày, đủ/thiếu công, OT 3 loại ngày, OT đêm, phụ trội Giờ làm đêm, phụ cấp chịu/không chịu thuế và quy đổi, lương BH vượt trần, từng bậc thuế, có/không người phụ thuộc, tạm ứng, net ≤ 0, làm tròn

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Wizard kỳ lương Setup → Preview → Confirm, drawer chi tiết, cảnh báo bất thường
- **Pattern:** P5, P2, P8 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#29 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #08 Tab Ngân hàng, Người phụ thuộc, BHXH, Tài liệu, Giấy tờ expat — `.scratch/hrm-02-people/issues/08-profile-bank-dependents-insurance-docs.md`
- #26 Bảng công tháng, khóa kỳ công & lịch công của nhân viên — `.scratch/hrm-05-time/issues/26-monthly-timesheet-lock.md`
- #28 Tham số lương/BHXH/thuế & thành phần lương — `.scratch/hrm-06-payroll/issues/28-payroll-parameters-components.md`
