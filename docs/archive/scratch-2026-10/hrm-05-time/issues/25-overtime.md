Status: ready-for-agent
Type: AFK

# #25 Đăng ký & tính tăng ca (OT)

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 60, 61

## What to build

Nhân viên đăng ký OT trước hoặc xác nhận sau khi làm, qua Luồng phê duyệt. Bộ xử lý chấm công tính giờ OT theo giờ quẹt thẻ thực tế, đối chiếu với OT đã duyệt; thời gian ở lại sau ca không có OT duyệt thì không tính. Phân loại OT theo ngày chứa giờ đó (ngày thường / ngày nghỉ hằng tuần theo Lịch làm việc / ngày lễ) và theo có rơi vào khung đêm hay không. Ca đêm theo lịch không phải OT; phần giờ đó được đếm là Giờ làm đêm. Vượt trần OT (tháng/năm, cấu hình được) thì cảnh báo, không chặn.

## Acceptance criteria

- [ ] OT chỉ được tính khi có đơn đã duyệt
- [ ] Giờ OT = giao của khoảng đã duyệt và khoảng quẹt thẻ thực tế
- [ ] Ca đêm 22:00–06:00 cộng OT 06:00–08:00 vào ngày nghỉ hằng tuần cho ra 8 Giờ làm đêm và 2 giờ OT ngày nghỉ (không có OT đêm)
- [ ] Unit test: OT đã duyệt, không được duyệt, OT ngày lễ, OT đêm, ca đêm theo lịch, vượt trần

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Đơn OT
- **Pattern:** P4, P7 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #12 Luồng duyệt, hộp thư chờ duyệt & thông báo — `.scratch/hrm-02-people/issues/12-approval-workflow-inbox.md`
- #23 Import log quẹt thẻ & Bộ xử lý chấm công — `.scratch/hrm-05-time/issues/23-punch-import-attendance-engine.md`
