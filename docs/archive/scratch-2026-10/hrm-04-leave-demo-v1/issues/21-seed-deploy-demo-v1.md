Status: ready-for-human
Type: HITL

# #21 Seed dữ liệu thật & deploy Demo v1

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 85

## What to build

Script seed dữ liệu thật cho Demo v1: công ty, phòng ban, ~150 nhân viên tên Việt, HĐ, kỹ năng, dự án với heatmap đủ trạng thái rảnh/vừa/quá tải, đơn nghỉ đang chờ, giấy tờ sắp hết hạn; persona cho "Demo as…"; logo từ thư mục `brand/`. Deploy lên URL demo.

## Acceptance criteria

- [ ] Seed chạy lại được (idempotent) để reset demo
- [ ] Kịch bản demo v1 (dashboard → nhân viên → dự án/quá tải → heatmap → xin nghỉ/duyệt) chạy trơn tru
- [ ] HITL: người review dữ liệu và tập dượt kịch bản trước khi gửi link cho khách

## Blocked by

- #19 Lịch nghỉ phép, thông báo PM & chuyển phép tồn — `.scratch/hrm-04-leave-demo-v1/issues/19-leave-calendar-carry-over.md`
- #20 Dashboard v1 — `.scratch/hrm-04-leave-demo-v1/issues/20-dashboard-v1.md`
