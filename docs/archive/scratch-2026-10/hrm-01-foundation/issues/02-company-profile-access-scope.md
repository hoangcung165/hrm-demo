Status: ready-for-agent
Type: AFK

# #02 Thông tin công ty & khung Phạm vi truy cập

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 1

## What to build

Hệ thống phục vụ **một Pháp nhân duy nhất**, được tạo lúc cài đặt (xem ADR 0003). Admin cập nhật thông tin công ty (tên, mã số thuế, địa chỉ, người đại diện, logo); thông tin này được dùng khi xuất HĐ, phiếu lương, báo cáo. Các bảng gốc gắn `legal_entity_id`, và việc lọc theo Pháp nhân được áp dụng tập trung ở tầng truy cập dữ liệu. Không có giao diện tạo hay chuyển Pháp nhân. Xây khung module thuần **Phạm vi truy cập** (nhận người dùng + vai trò, trả bộ lọc dữ liệu và quyền chức năng), bắt đầu với phạm vi "bản thân" và "toàn công ty". Issue #04 mở rộng thêm phạm vi theo phòng ban.

## Acceptance criteria

- [ ] Lần khởi động đầu tiên tạo đúng một Pháp nhân mặc định; không có API hay UI nào tạo thêm Pháp nhân
- [ ] Admin sửa được thông tin công ty và logo; logo hiển thị trên header
- [ ] Bảng gốc có `legal_entity_id`, lọc tập trung (không truy vấn nào tự lọc thủ công)
- [ ] Unit test module Phạm vi truy cập: nhân viên chỉ thấy bản thân, HR thấy toàn công ty
- [ ] API integration test: nhân viên không đọc được hồ sơ của người khác

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Thông tin công ty
- **Pattern:** P4 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #01 Khung dự án chạy end-to-end — `.scratch/hrm-01-foundation/issues/01-walking-skeleton.md`
