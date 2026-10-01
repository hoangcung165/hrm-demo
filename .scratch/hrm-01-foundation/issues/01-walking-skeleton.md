Status: ready-for-human
Type: HITL

# #01 Khung dự án chạy end-to-end

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 9, 17

## What to build

Dựng khung toàn hệ thống theo stack đã chốt trong ADR `docs/adr/0001-tech-stack.md` (issue #00): frontend, backend chia theo 5 context (org, people, time, payroll, projects), database, mail server test, tất cả chạy bằng một lệnh. Có đăng nhập bằng tài khoản admin seed sẵn, đổi mật khẩu, quên mật khẩu (email qua mail server test), khung layout (sidebar, header, trang chủ trống), chuyển ngôn ngữ vi/en. Dựng bộ component UI dùng chung (DataTable, FormField, DateRangePicker, layout) theo danh sách thư viện ở phần Comments của #00. Có sẵn khung unit test và API integration test (database thật trong container) chạy được bằng một lệnh.

## Acceptance criteria

- [ ] Một lệnh khởi động toàn bộ hệ thống, mở trình duyệt đăng nhập được bằng admin seed
- [ ] Đổi mật khẩu và quên mật khẩu hoạt động; email reset xuất hiện trong mail server test
- [ ] Chuyển vi/en đổi toàn bộ nhãn trên layout
- [ ] Có ít nhất 1 unit test và 1 API integration test mẫu chạy xanh; đây là prior art cho các issue sau
- [ ] Token của artifact HRM được ánh xạ sang CSS variables (theme shadcn) + `tailwind.config`; Inter tự host; hàm format ngày/giờ/tiền dùng chung; App shell và Đăng nhập khớp artboard trên canvas chính
- [ ] HITL: người review cấu trúc thư mục, quy ước đặt tên và cách tách context trước khi merge

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Đăng nhập, Quên/Đổi mật khẩu, App shell
- **Pattern:** P1, P4, P10 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#01 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #00 Chọn tech stack — `.scratch/hrm-01-foundation/issues/00-choose-tech-stack.md`
