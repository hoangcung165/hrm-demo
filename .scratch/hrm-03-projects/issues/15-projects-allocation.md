Status: ready-for-agent
Type: AFK

# #15 Dự án, phân bổ nhân sự & cảnh báo quá tải

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 33, 34, 35

## What to build

PM tạo dự án (mã, tên, khách hàng, PM, phòng ban phụ trách, ngày bắt đầu/kết thúc, trạng thái, ngân sách nhân sự) và phân bổ thành viên (vai trò dự án, % phân bổ, khoảng ngày). Xây module thuần **Bộ tính phân bổ**: tổng tải theo người theo kỳ, phát hiện vượt 100%, hàm "thử phân bổ" trước khi lưu. UI hiển thị cảnh báo đỏ khi phân bổ mới làm ai đó vượt 100% trong bất kỳ khoảng chồng lấn nào.

## Acceptance criteria

- [ ] Phân bổ làm tổng vượt 100% hiện cảnh báo nêu rõ người, kỳ và các dự án gây chồng lấn
- [ ] Một người ở nhiều dự án với các khoảng ngày khác nhau được tính đúng
- [ ] Phạm vi truy cập: PM chỉ sửa dự án mình quản lý
- [ ] Unit test module: chồng lấn, đúng 100%, vượt 100%, bắt đầu/kết thúc giữa kỳ, thử phân bổ
- [ ] API integration test: phân bổ vượt 100% trả cảnh báo

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Danh sách dự án, chi tiết dự án, dialog phân bổ + cảnh báo quá tải
- **Pattern:** P2, P3, P4 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#15 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #06 Danh sách nhân viên & hồ sơ cơ bản — `.scratch/hrm-02-people/issues/06-employee-list-profile.md`
