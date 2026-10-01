Status: ready-for-agent
Type: AFK

# #13 Audit log

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 16

## What to build

Ghi tự động mọi thay đổi trên thực thể nhạy cảm (hồ sơ lương, hợp đồng, công, phân bổ, phê duyệt, tham số): ai, lúc nào, giá trị trước → sau. Màn hình tra cứu audit log cho Admin/Giám đốc, lọc theo đối tượng, người, thời gian.

## Acceptance criteria

- [ ] Sửa lương trong hồ sơ tạo bản ghi audit có trước/sau
- [ ] Audit log chỉ đọc, không sửa/xóa được qua UI/API
- [ ] Thực thể mới đăng ký audit bằng cấu hình, không lặp code

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Audit log (danh sách + so sánh trước/sau)
- **Pattern:** P2 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #06 Danh sách nhân viên & hồ sơ cơ bản — `.scratch/hrm-02-people/issues/06-employee-list-profile.md`
