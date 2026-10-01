Status: ready-for-agent
Type: AFK

# #12 Luồng duyệt, hộp thư chờ duyệt & thông báo

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 12, 13, 14, 15, 77, 86, 87

## What to build

Xây module thuần **Luồng phê duyệt**: máy trạng thái dùng chung `Draft → Pending(level n) → Approved | Rejected | ReturnedForInfo | Cancelled`, tối đa 3 cấp; người duyệt mỗi cấp xác định theo quy tắc (quản lý trực tiếp, PM, vai trò); tự duyệt sau N ngày; phát sự kiện khi chuyển trạng thái. Admin cấu hình luồng theo loại yêu cầu. Có hộp thư chờ duyệt, thông báo trong app (chuông) và email. Loại yêu cầu đầu tiên dùng luồng này: nhân viên gửi cập nhật hồ sơ → HR duyệt → dữ liệu mới được áp dụng.

## Acceptance criteria

- [ ] Cấu hình được 1–3 cấp cho một loại yêu cầu
- [ ] Người không đúng cấp không duyệt được (kể cả gọi API)
- [ ] Tự duyệt sau N ngày chạy bằng job nền
- [ ] Người gửi nhận thông báo khi được duyệt/từ chối/trả về
- [ ] Người duyệt trùng người gửi thì đơn tự đẩy lên cấp trên (Quản lý trực tiếp của người đó → Trưởng đơn vị cấp cha → vai trò HR)
- [ ] Ủy quyền duyệt theo khoảng ngày: người được ủy quyền thấy cả đơn mới lẫn đơn đang chờ; nhật ký ghi "X duyệt thay Y"
- [ ] Tự duyệt sau N ngày và Ủy quyền duyệt bật/tắt được theo loại đơn (bảng lương không bao giờ tự duyệt)
- [ ] Từ chối ở bất kỳ cấp nào thì kết thúc đơn, gửi lại phải đi từ cấp 1; Trả về để bổ sung thì gửi lại tiếp tục từ cấp đã trả về
- [ ] Unit test module: tự đẩy lên cấp trên, ủy quyền, từ chối và trả về, 1/2/3 cấp, từ chối giữa chừng, trả về, tự duyệt, sai người duyệt, sự kiện khi chốt

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Hộp thư duyệt, chi tiết yêu cầu, cấu hình luồng duyệt, ủy quyền, chuông thông báo
- **Pattern:** P2, P7 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#12 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #04 Người dùng, vai trò (RBAC) & nút Demo as… — `.scratch/hrm-01-foundation/issues/04-users-roles-demo-as.md`
- #06 Danh sách nhân viên & hồ sơ cơ bản — `.scratch/hrm-02-people/issues/06-employee-list-profile.md`
