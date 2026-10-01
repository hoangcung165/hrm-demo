# Context Map

| Context | Phạm vi | Docs |
|---|---|---|
| org | Pháp nhân (một công ty trong demo), cơ cấu tổ chức, người dùng & phân quyền (RBAC), danh mục, luồng duyệt, thông báo, audit log | `docs/contexts/org/` |
| people | Hồ sơ nhân viên, kỹ năng, hợp đồng, thử việc, quá trình công tác, nghỉ việc | `docs/contexts/people/` |
| time | Ca làm việc, chấm công, bảng công, tăng ca (OT), nghỉ phép & số dư phép | `docs/contexts/time/` |
| payroll | Kỳ lương, thành phần lương, BHXH, thuế TNCN, duyệt/khóa lương, phiếu lương, file ngân hàng | `docs/contexts/payroll/` |
| projects | Dự án, phân bổ nhân sự, resource heatmap, timesheet, utilization, chi phí dự án | `docs/contexts/projects/` |

System-wide decisions: `docs/adr/` (0001 tech stack, 0002 modular monolith, 0003 một Pháp nhân, 0004 ranh giới Hồ sơ lương). Mỗi context tạo `CONTEXT.md` và `adr/` riêng khi cần (qua `/grill-with-docs`).

## Quan hệ chính
- people → org: nhân viên thuộc một đơn vị tổ chức
- time → people: chấm công, nghỉ phép theo nhân viên
- payroll ← time: dùng bảng công đã khóa và OT
- payroll ← people: chỉ đọc **Hồ sơ lương** (có ngày hiệu lực) và người phụ thuộc, không đọc hợp đồng (ADR 0004)
- projects → people: phân bổ theo kỹ năng; projects ← time: nghỉ phép ảnh hưởng số người khả dụng
