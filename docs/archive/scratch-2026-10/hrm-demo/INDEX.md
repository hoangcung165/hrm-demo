# HRM Demo — Issue index

PRD: `.scratch/hrm-demo/PRD.md`. Issue đánh số toàn cục 00–37; mỗi nhóm là một folder `.scratch/<folder>/issues/`.

## Nền tảng (tuần 1) — `.scratch/hrm-01-foundation/`

| # | Issue | Type | Blocked by |
|---|---|---|---|
| 00 | [Chọn tech stack](../hrm-01-foundation/issues/00-choose-tech-stack.md) | HITL | — |
| 01 | [Khung dự án chạy end-to-end](../hrm-01-foundation/issues/01-walking-skeleton.md) | HITL | 00 |
| 02 | [Thông tin công ty & khung Phạm vi truy cập](../hrm-01-foundation/issues/02-company-profile-access-scope.md) | AFK | 01 |
| 03 | [Cơ cấu tổ chức nhiều cấp & sơ đồ tổ chức](../hrm-01-foundation/issues/03-org-structure.md) | AFK | 02 |
| 04 | [Người dùng, vai trò (RBAC) & nút Demo as…](../hrm-01-foundation/issues/04-users-roles-demo-as.md) | AFK | 03 |
| 05 | [Danh mục dùng chung](../hrm-01-foundation/issues/05-catalogs.md) | AFK | 02 |

## Hồ sơ nhân viên (tuần 2) — `.scratch/hrm-02-people/`

| # | Issue | Type | Blocked by |
|---|---|---|---|
| 06 | [Danh sách nhân viên & hồ sơ cơ bản](../hrm-02-people/issues/06-employee-list-profile.md) | AFK | 03, 05 |
| 07 | [Import/export nhân viên bằng Excel](../hrm-02-people/issues/07-employee-import-export.md) | AFK | 06 |
| 08 | [Tab Ngân hàng, Người phụ thuộc, BHXH, Tài liệu, Giấy tờ expat](../hrm-02-people/issues/08-profile-bank-dependents-insurance-docs.md) | AFK | 06 |
| 09 | [Kỹ năng & chứng chỉ](../hrm-02-people/issues/09-skills-certificates.md) | AFK | 06 |
| 10 | [Hợp đồng lao động & xuất Word/PDF](../hrm-02-people/issues/10-labor-contracts.md) | AFK | 06 |
| 11 | [Quá trình công tác, thử việc & nghỉ việc](../hrm-02-people/issues/11-working-history-probation-exit.md) | AFK | 06 |
| 12 | [Luồng duyệt, hộp thư chờ duyệt & thông báo](../hrm-02-people/issues/12-approval-workflow-inbox.md) | AFK | 04, 06 |
| 13 | [Audit log](../hrm-02-people/issues/13-audit-log.md) | AFK | 06 |
| 14 | [Cảnh báo sắp hết hạn](../hrm-02-people/issues/14-expiry-alerts.md) | AFK | 08, 09, 10, 11, 12 |

## Dự án & nhân sự dự án (tuần 3) — `.scratch/hrm-03-projects/`

| # | Issue | Type | Blocked by |
|---|---|---|---|
| 15 | [Dự án, phân bổ nhân sự & cảnh báo quá tải](../hrm-03-projects/issues/15-projects-allocation.md) | AFK | 06 |
| 16 | [Tìm người theo kỹ năng & thời gian trống](../hrm-03-projects/issues/16-skill-staffing-search.md) | AFK | 09, 15 |
| 17 | [Resource heatmap, bench & dashboard dự án](../hrm-03-projects/issues/17-resource-heatmap-dashboard.md) | AFK | 15 |

## Nghỉ phép + Demo v1 (tuần 4) — `.scratch/hrm-04-leave-demo-v1/`

| # | Issue | Type | Blocked by |
|---|---|---|---|
| 18 | [Chính sách phép, đơn nghỉ & số dư](../hrm-04-leave-demo-v1/issues/18-leave-policy-request-approval.md) | AFK | 05, 12 |
| 19 | [Lịch nghỉ phép, thông báo PM & chuyển phép tồn](../hrm-04-leave-demo-v1/issues/19-leave-calendar-carry-over.md) | AFK | 15, 18 |
| 20 | [Dashboard v1](../hrm-04-leave-demo-v1/issues/20-dashboard-v1.md) | AFK | 14, 17, 18 |
| 21 | [Seed dữ liệu thật & deploy Demo v1](../hrm-04-leave-demo-v1/issues/21-seed-deploy-demo-v1.md) | HITL | 19, 20 |

## Chấm công & timesheet (tuần 5) — `.scratch/hrm-05-time/`

| # | Issue | Type | Blocked by |
|---|---|---|---|
| 22 | [Ca làm việc & phân ca](../hrm-05-time/issues/22-shifts-scheduling.md) | AFK | 05, 06 |
| 23 | [Import log quẹt thẻ & Bộ xử lý chấm công](../hrm-05-time/issues/23-punch-import-attendance-engine.md) | AFK | 22 |
| 24 | [Chấm công thủ công & đơn bổ sung công](../hrm-05-time/issues/24-manual-attendance-adjustment.md) | AFK | 12, 23 |
| 25 | [Đăng ký & tính tăng ca (OT)](../hrm-05-time/issues/25-overtime.md) | AFK | 12, 23 |
| 26 | [Bảng công tháng, khóa kỳ công & lịch công của nhân viên](../hrm-05-time/issues/26-monthly-timesheet-lock.md) | AFK | 18, 24, 25 |
| 27 | [Timesheet dự án & PM duyệt](../hrm-05-time/issues/27-project-timesheet.md) | AFK | 12, 15 |

## Lương (tuần 6–7) — `.scratch/hrm-06-payroll/`

| # | Issue | Type | Blocked by |
|---|---|---|---|
| 28 | [Tham số lương/BHXH/thuế & thành phần lương](../hrm-06-payroll/issues/28-payroll-parameters-components.md) | HITL | 05 |
| 29 | [Máy tính lương & quy trình Setup → Preview → Confirm](../hrm-06-payroll/issues/29-payroll-calculator-preview.md) | AFK | 08, 26, 28 |
| 30 | [Duyệt bảng lương nhiều cấp & khóa kỳ lương](../hrm-06-payroll/issues/30-payroll-approval-lock.md) | AFK | 13, 29 |
| 31 | [Phiếu lương & file chi lương ngân hàng](../hrm-06-payroll/issues/31-payslip-bank-file.md) | AFK | 30 |

## Hoàn thiện Demo v2 (tuần 8) — `.scratch/hrm-07-demo-v2/`

| # | Issue | Type | Blocked by |
|---|---|---|---|
| 32 | [6 báo cáo xuất Excel](../hrm-07-demo-v2/issues/32-excel-reports.md) | AFK | 17, 26, 31 |
| 33 | [Dashboard v2 & tối ưu self-service trên mobile](../hrm-07-demo-v2/issues/33-dashboard-v2-mobile.md) | AFK | 31 |
| 34 | [Seed 3 kịch bản khách & deploy Demo v2](../hrm-07-demo-v2/issues/34-seed-deploy-demo-v2.md) | HITL | 32, 33 |

## P1 — làm nếu kịp — `.scratch/hrm-08-p1/`

| # | Issue | Type | Blocked by |
|---|---|---|---|
| 35 | [Chi phí nhân sự dự án (kế hoạch và thực tế)](../hrm-08-p1/issues/35-project-labor-cost.md) | AFK | 27, 31 |
| 36 | [Yêu cầu nhân sự cho dự án](../hrm-08-p1/issues/36-staffing-request.md) | AFK | 12, 16 |
| 37 | [Commission](../hrm-08-p1/issues/37-commission.md) | AFK | 31 |
