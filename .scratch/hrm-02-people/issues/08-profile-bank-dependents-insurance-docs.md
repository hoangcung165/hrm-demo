Status: ready-for-agent
Type: AFK

# #08 Tab Ngân hàng, Người phụ thuộc, BHXH, Tài liệu, Giấy tờ expat

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 22, 23, 24, 32

## What to build

Bổ sung các tab hồ sơ: nhiều tài khoản ngân hàng (đánh dấu tài khoản nhận lương mặc định); người phụ thuộc có ngày hiệu lực giảm trừ; thông tin BHXH/BHYT (mã số, ngày tham gia, nơi đăng ký, lương đóng BH); tài liệu đính kèm (upload/tải xuống); passport/visa/giấy phép lao động với ngày hết hạn, lọc nhân viên theo quốc tịch.

## Acceptance criteria

- [ ] Chỉ có đúng một tài khoản mặc định nhận lương
- [ ] Người phụ thuộc có ngày bắt đầu/kết thúc hiệu lực
- [ ] Upload và tải lại được file đính kèm
- [ ] Danh sách nhân viên lọc được theo quốc tịch

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Các tab Ngân hàng, Người phụ thuộc, BHXH, Tài liệu, Giấy tờ expat
- **Pattern:** P3, P8 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #06 Danh sách nhân viên & hồ sơ cơ bản — `.scratch/hrm-02-people/issues/06-employee-list-profile.md`
