Status: ready-for-agent
Type: AFK

# #24 Chấm công thủ công & đơn bổ sung công

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 58, 59

## What to build

Người phụ trách chấm công nhập công theo ngày/kỳ cho bộ phận không có máy. Nhân viên gửi đơn bổ sung công (quên quẹt) qua Luồng phê duyệt; khi duyệt, Bộ xử lý chấm công tính lại ngày đó.

## Acceptance criteria

- [ ] Nhập thủ công và log máy cho cùng ngày không bị cộng trùng
- [ ] Đơn bổ sung công đã duyệt sửa được trạng thái thiếu quẹt
- [ ] Unit test Bộ xử lý chấm công: có đơn bổ sung công đã duyệt

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Đơn bổ sung công, nhập công thủ công
- **Pattern:** P4, P7 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #12 Luồng duyệt, hộp thư chờ duyệt & thông báo — `.scratch/hrm-02-people/issues/12-approval-workflow-inbox.md`
- #23 Import log quẹt thẻ & Bộ xử lý chấm công — `.scratch/hrm-05-time/issues/23-punch-import-attendance-engine.md`
