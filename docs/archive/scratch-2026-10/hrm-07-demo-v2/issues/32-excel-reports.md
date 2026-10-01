Status: ready-for-agent
Type: AFK

# #32 6 báo cáo xuất Excel

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 84

## What to build

Các báo cáo có bộ lọc và xuất Excel: Danh sách nhân sự; Biến động nhân sự (tuyển mới, nghỉ việc, tỷ lệ nghỉ việc); Nghỉ phép; Tổng hợp chấm công; Tổng hợp lương; Phân bổ & utilization theo dự án.

## Acceptance criteria

- [ ] Mỗi báo cáo tôn trọng Phạm vi truy cập
- [ ] File Excel có tiêu đề, bộ lọc đã dùng, định dạng số/tiền Việt Nam
- [ ] Số liệu báo cáo lương khớp kỳ lương đã khóa

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Khung báo cáo dùng chung + 6 template Excel
- **Pattern:** P2 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #17 Resource heatmap, bench & dashboard dự án — `.scratch/hrm-03-projects/issues/17-resource-heatmap-dashboard.md`
- #26 Bảng công tháng, khóa kỳ công & lịch công của nhân viên — `.scratch/hrm-05-time/issues/26-monthly-timesheet-lock.md`
- #31 Phiếu lương & file chi lương ngân hàng — `.scratch/hrm-06-payroll/issues/31-payslip-bank-file.md`
