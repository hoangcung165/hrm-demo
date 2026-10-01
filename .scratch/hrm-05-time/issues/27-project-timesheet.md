Status: ready-for-agent
Type: AFK

# #27 Timesheet dự án & PM duyệt

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 39, 40, 78

## What to build

Nhân viên log giờ theo ngày/tuần cho các dự án đang được phân bổ, gửi tuần; PM duyệt/từ chối qua Luồng phê duyệt. Trang "Dự án của tôi" trong self-service hiển thị phân bổ hiện tại.

## Acceptance criteria

- [ ] Chỉ log được vào dự án mình đang được phân bổ
- [ ] Cảnh báo khi tổng giờ/ngày vượt ngưỡng cấu hình
- [ ] Timesheet đã duyệt không sửa được
- [ ] Utilization = giờ timesheet đã duyệt / giờ khả dụng (giờ chuẩn trừ nghỉ phép và ngày lễ), hiển thị trên dashboard dự án và heatmap (chế độ xem thực tế)
- [ ] Unit test: Utilization khi có nghỉ phép và ngày lễ trong kỳ

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Timesheet tuần (desktop + mobile), PM duyệt
- **Pattern:** P2, P7, P11 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#27 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #12 Luồng duyệt, hộp thư chờ duyệt & thông báo — `.scratch/hrm-02-people/issues/12-approval-workflow-inbox.md`
- #15 Dự án, phân bổ nhân sự & cảnh báo quá tải — `.scratch/hrm-03-projects/issues/15-projects-allocation.md`
