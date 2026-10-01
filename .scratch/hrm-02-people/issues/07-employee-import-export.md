Status: ready-for-agent
Type: AFK

# #07 Import/export nhân viên bằng Excel

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 19

## What to build

HR tải file mẫu, điền và import hàng loạt nhân viên; hệ thống kiểm tra và báo lỗi theo từng dòng, chỉ ghi khi không có lỗi (hoặc cho phép bỏ dòng lỗi). Export danh sách đang lọc ra Excel.

## Acceptance criteria

- [ ] Import file hợp lệ tạo đúng số nhân viên
- [ ] File có lỗi hiển thị bảng lỗi theo dòng/cột, không tạo dữ liệu dở dang
- [ ] Import lại không tạo trùng (khóa theo mã NV hoặc CCCD)
- [ ] Export giữ đúng bộ lọc hiện tại

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Wizard import nhân viên
- **Pattern:** P5 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #06 Danh sách nhân viên & hồ sơ cơ bản — `.scratch/hrm-02-people/issues/06-employee-list-profile.md`
