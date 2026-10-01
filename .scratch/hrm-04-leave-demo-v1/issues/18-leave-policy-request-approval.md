Status: ready-for-agent
Type: AFK

# #18 Chính sách phép, đơn nghỉ & số dư

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 45, 46, 47, 48, 50

## What to build

HR cấu hình loại phép và chính sách (phép năm theo thâm niên, ốm, thai sản, không lương). Xây module thuần **Chính sách phép**: tính số dư (được cấp, đã dùng, đang chờ, còn lại) và kiểm tra đơn hợp lệ. Nhân viên tạo đơn cả ngày hoặc nửa ngày (sáng/chiều), chọn người duyệt và CC, đính kèm file; đơn đi qua Luồng phê duyệt; số dư tự cập nhật khi duyệt/hủy.

## Acceptance criteria

- [ ] Phép năm cộng dồn 1/12 định mức mỗi tháng; người vào giữa tháng tính theo ngày chốt cấu hình; định mức tự tăng 1 ngày mỗi 5 năm thâm niên
- [ ] Ứng trước phép đến tối đa định mức năm (bật/tắt bằng cấu hình); số dư âm hiển thị rõ
- [ ] Nghỉ nửa ngày trừ 0,5 ngày; đơn qua cuối tuần/ngày lễ chỉ tính ngày làm việc
- [ ] Không gửi được đơn vượt số dư (với loại phép có giới hạn)
- [ ] Hủy đơn đã duyệt hoàn lại số dư
- [ ] Unit test module: cộng dồn theo tháng, vào làm giữa tháng, ứng trước (số dư âm), thâm niên, nửa ngày, qua cuối tuần/lễ, vượt số dư, hủy đơn
- [ ] API integration test: xin nghỉ nửa ngày → duyệt → số dư giảm 0,5

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Chính sách phép, form xin nghỉ (mobile), thẻ số dư phép
- **Pattern:** P4, P7, P11 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#18 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #05 Danh mục dùng chung — `.scratch/hrm-01-foundation/issues/05-catalogs.md`
- #12 Luồng duyệt, hộp thư chờ duyệt & thông báo — `.scratch/hrm-02-people/issues/12-approval-workflow-inbox.md`
