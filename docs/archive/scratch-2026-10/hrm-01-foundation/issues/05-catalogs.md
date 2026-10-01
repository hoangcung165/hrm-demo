Status: ready-for-agent
Type: AFK

# #05 Danh mục dùng chung

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 6

## What to build

Màn hình quản lý các danh mục: chức danh, loại hợp đồng, loại phụ cấp, ngày lễ, kỹ năng, vai trò dự án. Dùng chung một mẫu UI danh sách + form.

## Acceptance criteria

- [ ] CRUD được từng danh mục, có tìm kiếm
- [ ] Không xóa được mục đang được sử dụng (chỉ ngừng hoạt động)
- [ ] Seed sẵn giá trị mặc định hợp lý (ngày lễ Việt Nam năm hiện tại, loại HĐ theo luật)

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Danh mục (một mẫu dùng chung)
- **Pattern:** P2, P4 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #02 Thông tin công ty & khung Phạm vi truy cập — `.scratch/hrm-01-foundation/issues/02-company-profile-access-scope.md`
