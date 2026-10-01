Status: ready-for-agent
Type: AFK

# #09 Kỹ năng & chứng chỉ

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 25

## What to build

Tab Kỹ năng trong hồ sơ: chọn kỹ năng từ danh mục kèm mức độ 1–5; chứng chỉ có ngày cấp và ngày hết hạn, đính kèm file.

## Acceptance criteria

- [ ] Thêm/sửa/xóa kỹ năng với mức độ
- [ ] Chứng chỉ lưu ngày hết hạn (phục vụ cảnh báo ở issue 14)
- [ ] Dữ liệu kỹ năng truy vấn được theo kỹ năng + mức tối thiểu (phục vụ issue 16)

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Tab Kỹ năng
- **Pattern:** P3 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #06 Danh sách nhân viên & hồ sơ cơ bản — `.scratch/hrm-02-people/issues/06-employee-list-profile.md`
