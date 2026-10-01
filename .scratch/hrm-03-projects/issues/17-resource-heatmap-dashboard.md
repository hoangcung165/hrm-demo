Status: ready-for-agent
Type: AFK

# #17 Resource heatmap, bench & dashboard dự án

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 37, 38, 41, 42

## What to build

Màn hình heatmap nhân viên × tuần/tháng, tô màu theo tổng % phân bổ (rảnh / vừa / quá tải), lọc theo phòng ban/kỹ năng. Danh sách bench (phân bổ thấp/không có) và danh sách sắp hết dự án. Dashboard dự án: số dự án đang chạy, headcount theo dự án, Tải phân bổ trung bình. (Utilization cần timesheet đã duyệt nên được bổ sung ở #27.) Tab Dự án trong hồ sơ nhân viên hiển thị lịch sử tham gia.

## Acceptance criteria

- [ ] Heatmap với 700 nhân viên × 12 tuần hiển thị mượt (ảo hóa/phân trang)
- [ ] Màu và ngưỡng rảnh/quá tải cấu hình được
- [ ] Bấm vào ô heatmap xem chi tiết dự án của người đó trong kỳ
- [ ] Bench dùng ngưỡng Tải phân bổ cấu hình được (mặc định 50%); "Sắp hết dự án" dùng N tuần cấu hình được (mặc định 4)
- [ ] Unit test Bộ tính phân bổ: Tải phân bổ, bench, sắp hết dự án

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Resource heatmap, bench, dashboard dự án
- **Pattern:** thang heatmap (DESIGN_PLAN 1.2) (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#17 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #15 Dự án, phân bổ nhân sự & cảnh báo quá tải — `.scratch/hrm-03-projects/issues/15-projects-allocation.md`
