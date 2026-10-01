Status: ready-for-agent
Type: AFK

# #11 Quá trình công tác, thử việc & nghỉ việc

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 26, 29, 31

## What to build

Timeline quá trình công tác (tuyển vào, điều chuyển, bổ nhiệm, khen thưởng, kỷ luật). Quyết định có thay đổi lương hoặc phụ cấp (ví dụ bổ nhiệm kèm phụ cấp trách nhiệm) tạo một bản ghi Hồ sơ lương mới, giống cơ chế ở #10. Ghi nhận thử việc (bắt đầu/kết thúc, người đánh giá, kết quả Đạt/Không đạt/Gia hạn). Ghi nhận nghỉ việc (ngày làm cuối, lý do) → nhân viên chuyển Inactive, không bị xóa, vẫn tra cứu được.

## Acceptance criteria

- [ ] Điều chuyển/bổ nhiệm cập nhật phòng ban/chức danh hiện tại và thêm mốc vào timeline
- [ ] Đánh dấu thử việc Đạt sẽ gợi ý tạo HĐ chính thức, với dữ liệu điền sẵn từ HĐ thử việc
- [ ] Nhân viên Inactive không xuất hiện trong danh sách mặc định nhưng lọc ra được
- [ ] Không xóa cứng nhân viên đã có dữ liệu

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Dòng thời gian quá trình công tác, thử việc, dialog nghỉ việc
- **Pattern:** P6, P4 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #06 Danh sách nhân viên & hồ sơ cơ bản — `.scratch/hrm-02-people/issues/06-employee-list-profile.md`
