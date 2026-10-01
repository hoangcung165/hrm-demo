Status: ready-for-agent
Type: AFK

# #20 Dashboard v1

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 83

## What to build

Trang chủ theo vai trò: headcount, số người đang làm/nghỉ phép hôm nay, đơn chờ tôi duyệt (duyệt nhanh ngay trên dashboard), giấy tờ sắp hết hạn, Tải phân bổ trung bình và bench (cho Giám đốc/PM; Utilization có từ Demo v2).

## Acceptance criteria

- [ ] Mỗi widget tôn trọng Phạm vi truy cập
- [ ] Duyệt nhanh trên dashboard đi qua Luồng phê duyệt như duyệt ở hộp thư
- [ ] Bấm widget đi tới màn hình chi tiết đã lọc sẵn

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Dashboard v1 theo vai trò (cập nhật artboard "Tổng quan")
- **Pattern:** P1, biểu đồ (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#20 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #14 Cảnh báo sắp hết hạn — `.scratch/hrm-02-people/issues/14-expiry-alerts.md`
- #17 Resource heatmap, bench & dashboard dự án — `.scratch/hrm-03-projects/issues/17-resource-heatmap-dashboard.md`
- #18 Chính sách phép, đơn nghỉ & số dư — `.scratch/hrm-04-leave-demo-v1/issues/18-leave-policy-request-approval.md`
