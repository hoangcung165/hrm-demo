Status: ready-for-agent
Type: AFK

# #22 Ca làm việc & phân ca

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 53, 54

## What to build

HR định nghĩa ca (hành chính, xoay, ca đêm qua ngày), giờ nghỉ, dung sai đi trễ/về sớm, quy tắc làm tròn. Phân ca cho cá nhân hoặc nhóm trên lịch (tuần/tháng), có ca mặc định theo nhóm.

## Acceptance criteria

- [ ] Ca đêm qua ngày lưu và hiển thị đúng
- [ ] Phân ca hàng loạt cho một nhóm trong một khoảng ngày
- [ ] Mỗi nhân viên có đúng một lịch ca cho mỗi ngày

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Ca làm việc, lịch phân ca
- **Pattern:** P4, P9 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #05 Danh mục dùng chung — `.scratch/hrm-01-foundation/issues/05-catalogs.md`
- #06 Danh sách nhân viên & hồ sơ cơ bản — `.scratch/hrm-02-people/issues/06-employee-list-profile.md`
