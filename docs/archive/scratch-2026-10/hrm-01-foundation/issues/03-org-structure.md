Status: ready-for-agent
Type: AFK

# #03 Cơ cấu tổ chức nhiều cấp & sơ đồ tổ chức

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 4, 5

## What to build

HR/Admin quản lý cây tổ chức Công ty → Phòng ban → Nhóm/Tổ (thêm, sửa, di chuyển, ngừng hoạt động), gán trưởng đơn vị. Có màn hình sơ đồ tổ chức (org chart) trực quan.

## Acceptance criteria

- [ ] Tạo được cây nhiều cấp, di chuyển một đơn vị sang cha khác
- [ ] Không xóa được đơn vị còn nhân viên hoặc đơn vị con (chỉ ngừng hoạt động)
- [ ] Org chart hiển thị đúng cây và trưởng đơn vị

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Cơ cấu tổ chức: cây + org chart
- **Pattern:** P3 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#03 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #02 Thông tin công ty & khung Phạm vi truy cập — `.scratch/hrm-01-foundation/issues/02-company-profile-access-scope.md`
