Status: ready-for-agent
Type: AFK

# #26 Bảng công tháng, khóa kỳ công & lịch công của nhân viên

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 62, 63, 79

## What to build

Bảng công tháng mỗi nhân viên: công chuẩn, công thực tế, số lần trễ/sớm, ngày nghỉ phép (lấy từ module Nghỉ phép), giờ OT theo loại ngày. Kỳ công có trạng thái `Open → PendingApproval → Locked`; HR duyệt và khóa; sau khóa không sửa được công của kỳ. Nhân viên xem lịch công tháng của mình (web/mobile).

## Acceptance criteria

- [ ] Ngày nghỉ phép đã duyệt hiện đúng trên bảng công
- [ ] Kỳ công đã khóa từ chối mọi thay đổi (UI và API)
- [ ] Tổng hợp tháng khớp tổng các ngày
- [ ] API integration test: import log → khóa kỳ công

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Bảng công tháng + khóa kỳ công, lịch công của tôi (mobile)
- **Pattern:** P2, P9, P11 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#26 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #18 Chính sách phép, đơn nghỉ & số dư — `.scratch/hrm-04-leave-demo-v1/issues/18-leave-policy-request-approval.md`
- #24 Chấm công thủ công & đơn bổ sung công — `.scratch/hrm-05-time/issues/24-manual-attendance-adjustment.md`
- #25 Đăng ký & tính tăng ca (OT) — `.scratch/hrm-05-time/issues/25-overtime.md`
