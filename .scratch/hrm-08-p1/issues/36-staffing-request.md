Status: ready-for-agent
Type: AFK

# #36 Yêu cầu nhân sự cho dự án

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 44

## What to build

PM gửi yêu cầu nhân sự (vai trò, kỹ năng, % phân bổ, khoảng thời gian) qua Luồng phê duyệt. Người quản lý nguồn lực/HR xử lý: gán người từ bench (dùng Tìm người theo kỹ năng) hoặc đánh dấu cần tuyển.

## Acceptance criteria

- [ ] Yêu cầu có trạng thái theo dõi được đến khi đã gán người
- [ ] Gán người từ yêu cầu tạo phân bổ và đi qua kiểm tra quá tải

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Yêu cầu nhân sự
- **Pattern:** P4, P7 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #12 Luồng duyệt, hộp thư chờ duyệt & thông báo — `.scratch/hrm-02-people/issues/12-approval-workflow-inbox.md`
- #16 Tìm người theo kỹ năng & thời gian trống — `.scratch/hrm-03-projects/issues/16-skill-staffing-search.md`
