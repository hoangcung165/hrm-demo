Status: ready-for-agent
Type: AFK

# #19 Lịch nghỉ phép, thông báo PM & chuyển phép tồn

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 49, 51, 52

## What to build

Lịch nghỉ phép theo tháng/tuần với trạng thái đã duyệt/chờ duyệt, lọc theo phòng ban hoặc dự án. Khi nhân viên xin nghỉ, PM của các dự án người đó đang tham gia (trong khoảng ngày nghỉ) nhận thông báo. Job cuối năm chuyển phép chưa dùng thành **Phép tồn** (số ngày tối đa, hạn dùng cấu hình được, ví dụ 31/3). Khi nghỉ, phép tồn được trừ trước. Hết hạn thì phần còn lại tự mất. Khi xử lý nghỉ việc mà số dư phép năm âm, hệ thống cảnh báo HR.

## Acceptance criteria

- [ ] Lịch hiển thị đúng người vắng theo ngày
- [ ] Chỉ PM của dự án có phân bổ trùng thời gian nghỉ mới được thông báo
- [ ] Số dư hiển thị Được cấp đến nay / Đã dùng / Đang chờ / Còn lại, và Phép tồn kèm hạn dùng hiển thị riêng
- [ ] Unit test Chính sách phép: chuyển phép tồn cuối năm, trừ phép tồn trước, hết hạn phép tồn

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Lịch nghỉ phép
- **Pattern:** P9 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #15 Dự án, phân bổ nhân sự & cảnh báo quá tải — `.scratch/hrm-03-projects/issues/15-projects-allocation.md`
- #18 Chính sách phép, đơn nghỉ & số dư — `.scratch/hrm-04-leave-demo-v1/issues/18-leave-policy-request-approval.md`
