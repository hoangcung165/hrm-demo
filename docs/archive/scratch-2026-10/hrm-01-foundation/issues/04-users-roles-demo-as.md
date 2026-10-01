Status: ready-for-agent
Type: AFK

# #04 Người dùng, vai trò (RBAC) & nút Demo as…

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 7, 8, 10, 11

## What to build

Admin tạo tài khoản gắn với nhân viên, gán một hoặc nhiều vai trò (Admin, HR, Quản lý trực tiếp/Tổ trưởng, PM, Kế toán, Giám đốc, Nhân viên), khóa/mở khóa tài khoản. Module Phạm vi truy cập mở rộng thêm phạm vi theo phòng ban (quản lý chỉ thấy phòng mình) và theo bản thân. Menu/nút ẩn theo quyền. Có nút "Demo as…" (chỉ bật ở môi trường demo) để đăng nhập nhanh bằng persona seed.

## Acceptance criteria

- [ ] Tài khoản bị khóa không đăng nhập được
- [ ] Mỗi vai trò chỉ thấy menu và dữ liệu đúng phạm vi
- [ ] "Demo as…" chuyển persona trong 1 click, bị tắt khi cấu hình môi trường không phải demo
- [ ] Unit test Phạm vi truy cập: manager chỉ thấy phòng mình, nhân viên chỉ thấy bản thân

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Tài khoản & vai trò, ma trận quyền, Demo as…
- **Pattern:** P1, P2 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #03 Cơ cấu tổ chức nhiều cấp & sơ đồ tổ chức — `.scratch/hrm-01-foundation/issues/03-org-structure.md`
