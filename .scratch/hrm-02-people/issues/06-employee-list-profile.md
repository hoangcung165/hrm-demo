Status: ready-for-agent
Type: AFK

# #06 Danh sách nhân viên & hồ sơ cơ bản

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 18, 20, 21

## What to build

HR xem danh sách nhân viên (tìm kiếm, lọc theo phòng ban, chức danh, trạng thái), tạo và sửa hồ sơ với khung nhiều tab; issue này làm tab Cá nhân (họ tên, ngày sinh, CCCD, MST, số BHXH, liên hệ) và tab Công việc (mã NV tự tăng, phòng ban, chức danh, quản lý trực tiếp, ngày vào làm, trạng thái).

## Acceptance criteria

- [ ] Tạo nhân viên mới, mã NV sinh tự động không trùng
- [ ] Lọc và tìm kiếm trả kết quả đúng, phân trang với 700 bản ghi vẫn mượt
- [ ] Validation các trường bắt buộc và định dạng (CCCD, MST)
- [ ] Khung tab sẵn chỗ cho các tab của issue sau

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Danh sách NV (cập nhật artboard đã có), khung Hồ sơ NV, form tạo NV
- **Pattern:** P2, P3, P8 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#06 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #03 Cơ cấu tổ chức nhiều cấp & sơ đồ tổ chức — `.scratch/hrm-01-foundation/issues/03-org-structure.md`
- #05 Danh mục dùng chung — `.scratch/hrm-01-foundation/issues/05-catalogs.md`
