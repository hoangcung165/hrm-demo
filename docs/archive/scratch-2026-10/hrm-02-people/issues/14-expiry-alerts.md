Status: ready-for-agent
Type: AFK

# #14 Cảnh báo sắp hết hạn

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 30

## What to build

Job hằng ngày quét HĐ, thử việc, visa, giấy phép lao động, chứng chỉ sắp hết hạn theo số ngày cấu hình trước (ví dụ HĐ 30 ngày, visa 60 ngày); gửi thông báo trong app + email cho HR và người liên quan; có danh sách "Sắp hết hạn" để dashboard dùng.

## Acceptance criteria

- [ ] Số ngày báo trước cấu hình được theo loại giấy tờ
- [ ] Không gửi trùng thông báo cho cùng một mục trong cùng mốc
- [ ] Danh sách sắp hết hạn lọc theo loại và thời gian

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Danh sách sắp hết hạn
- **Pattern:** P2, P7 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #08 Tab Ngân hàng, Người phụ thuộc, BHXH, Tài liệu, Giấy tờ expat — `.scratch/hrm-02-people/issues/08-profile-bank-dependents-insurance-docs.md`
- #09 Kỹ năng & chứng chỉ — `.scratch/hrm-02-people/issues/09-skills-certificates.md`
- #10 Hợp đồng lao động & xuất Word/PDF — `.scratch/hrm-02-people/issues/10-labor-contracts.md`
- #11 Quá trình công tác, thử việc & nghỉ việc — `.scratch/hrm-02-people/issues/11-working-history-probation-exit.md`
- #12 Luồng duyệt, hộp thư chờ duyệt & thông báo — `.scratch/hrm-02-people/issues/12-approval-workflow-inbox.md`
