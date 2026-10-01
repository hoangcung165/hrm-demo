Status: ready-for-agent
Type: AFK

# #16 Tìm người theo kỹ năng & thời gian trống

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 36

## What to build

Trong dự án, PM mở "Tìm người": lọc theo kỹ năng, mức tối thiểu, khoảng thời gian cần; kết quả hiển thị % còn trống của từng người trong khoảng đó (dùng Bộ tính phân bổ) và cho phép phân bổ ngay từ kết quả.

## Acceptance criteria

- [ ] Kết quả sắp xếp theo mức độ khớp kỹ năng và % trống
- [ ] Phân bổ từ kết quả đi qua cùng kiểm tra quá tải như issue 15
- [ ] Nhân viên Inactive không xuất hiện

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Drawer tìm người theo kỹ năng
- **Pattern:** P4 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#16 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #09 Kỹ năng & chứng chỉ — `.scratch/hrm-02-people/issues/09-skills-certificates.md`
- #15 Dự án, phân bổ nhân sự & cảnh báo quá tải — `.scratch/hrm-03-projects/issues/15-projects-allocation.md`
