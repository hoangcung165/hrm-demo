# PRD: HRM Demo App (8 tuần)

Nguồn: `HRM_Demo_Features.md`, `CONTEXT-MAP.md`. Contexts: `org`, `people`, `time`, `payroll`, `projects`.

## Problem Statement

Doanh nghiệp vừa và nhỏ tại Việt Nam (150–700 nhân sự, gồm công ty dịch vụ/dự án và doanh nghiệp sản xuất) đang quản lý nhân sự bằng Excel và giấy tờ:

- Hồ sơ nhân viên, hợp đồng, bằng cấp, visa/giấy phép lao động nằm rải rác ở nhiều file. Không ai nhắc khi hợp đồng hay thử việc sắp hết hạn.
- Đơn nghỉ phép, tăng ca, bổ sung công đi qua giấy/email. Số dư phép phải tính tay.
- Chấm công phải tổng hợp thủ công từ máy vân tay và Excel. Ca đêm, đi trễ, tăng ca dễ bị tính sai.
- Mỗi tháng HR tính lương, BHXH, thuế TNCN bằng nhiều bảng Excel lồng công thức. Sai một ô là sai cả bảng, không có lịch sử ai sửa gì. Duyệt lương qua nhiều cấp bằng giấy.
- Quản lý dự án không biết ai đang rảnh, ai đang quá tải. Không đo được tỷ lệ sử dụng nhân sự và chi phí nhân sự theo dự án.
- Ban lãnh đạo không có số liệu tức thời về headcount, biến động nhân sự, quỹ lương.

Nhà cung cấp (chúng ta) cần một **app demo chạy thật trong 8 tuần** để trình diễn cho khách tiềm năng và chốt hợp đồng.

## Solution

Một web app HRM, giao diện responsive, song ngữ Việt/Anh. Dữ liệu chạy xuyên suốt 2 luồng end-to-end:

1. **Luồng nhân sự:** Hồ sơ → Chấm công/Nghỉ phép → Tính lương → Duyệt nhiều cấp → Phiếu lương → File chi lương ngân hàng.
2. **Luồng dự án:** Dự án → Phân bổ nhân sự (có cảnh báo quá tải) → Timesheet → Utilization và chi phí nhân sự dự án.

Nguyên tắc thiết kế:
- **Một công ty:** demo phục vụ một Pháp nhân duy nhất, không có giao diện đa công ty. Kiến trúc vẫn giữ sẵn đường mở rộng (xem ADR 0003).
- **Cấu hình được, không hard-code:** loại phép, phụ cấp, ca, cấp duyệt, tham số lương/thuế/BHXH đều có ngày hiệu lực.
- **Phân quyền theo vai trò và phạm vi dữ liệu.**
- **Có audit log.**
- **Seed dữ liệu thật và có nút "Demo as…"** để chuyển vai trò 1 click khi trình diễn.

## User Stories

### Nền tảng & quản trị (org)
1. As an Admin, I want to maintain the company profile (name, tax code, address, logo), so that contracts, payslips and reports carry the correct company information.
2. *(Đã bỏ: chuyển công ty. Đa công ty chuyển sang Out of Scope.)*
3. *(Đã bỏ: tách dữ liệu giữa các công ty. Đa công ty chuyển sang Out of Scope.)*
4. As an Admin, I want to define a multi-level org structure (company → department → team), so that employees and approvals follow real reporting lines.
5. As an HR, I want to see an org chart, so that I can explain the structure to management quickly.
6. As an Admin, I want to manage catalogs (positions, contract types, allowance types, leave types, shifts, holidays, skills, project roles), so that business rules are configurable without code changes.
7. As an Admin, I want to create user accounts linked to employees and assign one or more roles (Admin, HR, Line Manager/Team Lead, Project Manager, Accountant, Director, Employee), so that each person only accesses what their job requires.
8. As an Admin, I want role permissions scoped by department and project, so that a manager only sees their own team's data.
9. As a user, I want to log in, change my password and reset a forgotten password, so that I can access the system securely.
10. As an Admin, I want to lock and unlock accounts, so that departed or compromised users cannot sign in.
11. As a presenter, I want a "Demo as…" switcher that logs me in as a seeded persona in one click, so that I can show every role smoothly during a demo.
12. As an Admin, I want to configure approval flows per request type (leave, OT, attendance adjustment, timesheet, payroll, profile update) with up to 3 levels, so that approvals match company policy.
13. As an Admin, I want to set auto-approval after N days without action, so that requests don't get stuck when a manager is unresponsive.
14. As an approver, I want an in-app inbox of pending items and email notifications, so that I never miss a request.
15. As a requester, I want to be notified when my request is approved, rejected, or returned for more info, so that I know what to do next.
16. As an auditor/Director, I want an audit log of who changed salary, attendance, allocations and approvals, and when, so that changes are traceable.
86. As an approver going on leave, I want to delegate my approvals to a colleague for a date range, so that pending and new requests keep moving while I'm away.
87. As a manager, I want my own requests to go to the level above me automatically, so that nobody approves their own request.
17. As a user, I want to switch the UI between Vietnamese and English, so that local and foreign staff can both use the system.

### Hồ sơ nhân viên (people)
18. As an HR, I want a searchable, filterable employee list (by department, status, position), so that I can find anyone quickly.
19. As an HR, I want to import and export employees via Excel with row-level validation errors, so that onboarding a whole company is fast.
20. As an HR, I want an employee profile with tabs (Personal, Job, Contracts, Salary & Allowances, Insurance, Bank, Dependents, Skills, Projects, Documents), so that all information is in one place.
21. As an HR, I want to record personal data (ID card, tax code, social insurance number, contacts), so that payroll and statutory reporting have correct inputs.
22. As an HR, I want to record passport, visa and work permit with expiry dates for foreign employees, and filter by nationality, so that expat compliance is managed.
23. As an HR, I want to record dependents with effective dates, so that family deductions for PIT are correct.
24. As an HR, I want to record multiple bank accounts and mark the default salary account, so that the bank transfer file is correct.
25. As an HR, I want to record skills with a proficiency level (1–5) and certificates with expiry dates, so that PMs can staff projects by skill.
26. As an HR, I want to record working history (hire, transfer, promotion, reward, discipline) on a timeline, so that the employee's career is visible at a glance.
27. As an HR, I want to create, edit and delete labor contracts and contract amendments (type, sign date, start/end date, salary, allowances), so that each one produces a dated salary-profile record that payroll uses.
28. As an HR, I want to export a contract to Word/PDF from a template, so that I can print and sign it immediately.
29. As an HR, I want to record probation (start/end, evaluator, result Pass/Fail/Extend), so that probation outcomes are tracked.
30. As an HR, I want to be alerted before contracts, probations, visas, work permits and certificates expire, so that nothing lapses.
31. As an HR, I want to record a resignation (last day, reason) and move the employee to Inactive without deleting, so that history and tax data are preserved.
32. As an HR, I want to attach documents to an employee profile, so that scanned papers are stored with the record.

### Dự án & nhân sự dự án (projects)
33. As a PM, I want to create a project (code, name, client, PM, owning department, start/end dates, status, labor budget), so that work is tracked as a project.
34. As a PM, I want to allocate employees to my project with a project role, % allocation and date range, so that the team plan is explicit.
35. As a PM, I want the system to warn me when an allocation would push someone above 100% in any overlapping period, so that I don't overload people.
36. As a PM, I want to search employees by skill, level and availability in a date range, and allocate directly from the results, so that staffing is fast.
37. As a resource manager/Director, I want a resource heatmap (employees × weeks/months, colored by total allocation), so that I can see who is free, balanced or overloaded.
38. As a resource manager, I want a bench list (people with low or no allocation) and a list of people whose projects end soon, so that I can plan reassignments.
39. As an employee, I want to log timesheet hours per project per day/week, so that my effort is recorded.
40. As a PM, I want to approve or reject team timesheets, so that recorded effort is validated.
41. As an HR, I want the employee profile's Projects tab to show project history with roles and periods, so that experience is visible.
42. As a Director, I want a project dashboard (active projects, headcount per project, average allocation load, utilization rate once timesheets exist, bench), so that I can manage capacity.
43. As a PM, I want to see labor cost per project (salary × allocation or × timesheet hours) against budget, planned vs actual, so that I can control project cost. *(P1)*
44. As a PM, I want to submit a staffing request (role, skills, period) that HR fulfils from the bench, so that staffing is a tracked process. *(P1)*

### Nghỉ phép (time)
45. As an HR, I want to configure leave policies (annual leave by seniority, sick, maternity, unpaid; carry-over rules and expiry), so that entitlements follow company policy.
46. As an employee, I want to request full-day or half-day (morning/afternoon) leave, pick approvers and CC people, and attach files, so that requesting leave is quick.
47. As an employee, I want to see my leave balance per type (entitled, used, pending, remaining), so that I plan time off correctly.
48. As an approver, I want to approve, reject or request more info on leave requests, so that decisions are recorded.
49. As a PM, I want to be notified when a member of my project requests leave, so that I can plan around absences.
50. As an HR, I want balances to update automatically when leave is approved or cancelled, so that no manual recalculation is needed.
51. As a manager, I want a leave calendar (month/week) filterable by department or project, so that I can see who is out.
52. As an HR, I want year-end carry-over of unused leave according to the policy, so that balances roll correctly.

### Chấm công & ca (time)
53. As an HR, I want to define shifts (office, rotating, overnight crossing midnight), break times and late/early tolerance, so that attendance rules match reality.
54. As an HR/Team Lead, I want to assign shifts to individuals or teams on a calendar, so that each person has an expected schedule.
55. As an HR, I want to import a punch log file (CSV/Excel) from fingerprint machines and see validation errors (unknown employee code, duplicates), so that attendance data enters the system reliably.
56. As an HR, I want the system to pair in/out punches per shift (first-in/last-out, overnight aware), so that daily worked time is computed automatically.
57. As an HR, I want late arrival, early leave, missing punches and absences flagged per day, so that exceptions are visible.
58. As a timekeeper, I want to enter attendance manually for departments without machines, so that everyone is covered.
59. As an employee, I want to submit an attendance adjustment request for a forgotten punch, so that my timesheet is corrected via approval.
60. As an employee, I want to register overtime in advance or confirm it afterwards, so that both planned and urgent OT are covered.
61. As an HR, I want OT hours computed from actual punches and matched against approved OT, and time after shift that is not approved OT excluded, so that OT pay is fair.
62. As an HR, I want a monthly timesheet per employee (standard days, worked days, late/early counts, leave days pulled from Leave, OT hours by day type), so that payroll has a single input.
63. As an HR, I want to approve and lock a timesheet period, so that payroll uses frozen data.

### Tính lương, BHXH, thuế TNCN (payroll)
64. As an HR/Accountant, I want to configure payroll parameters (base salary, regional minimum wage, insurance rates and caps, PIT brackets, family deductions) with effective dates, so that legal changes are handled by configuration.
65. As an HR, I want to configure pay components: allowances flagged as insurable/taxable/prorated by worked days, bonuses, deductions, advances, so that each company's pay structure fits.
66. As an HR, I want to create a payroll period and run calculation in three steps (Setup → Preview → Confirm), so that I can review before committing.
67. As an HR, I want salary computed from actual worked days against standard days, plus OT pay using weekday/weekend/holiday multipliers, so that pay reflects attendance.
68. As an HR, I want employee and employer social, health and unemployment insurance computed on the insurance salary, so that statutory contributions are correct.
69. As an HR, I want PIT computed progressively after personal and dependent deductions, so that tax withholding is correct.
70. As an HR, I want the preview to flag anomalies (e.g. net ≤ 0, large change vs last month, missing bank account), so that errors are caught before approval.
71. As an HR, I want to submit the payroll for multi-level approval (e.g. HR Manager → Chief Accountant → Director), so that payroll follows the company's approval chain.
72. As an approver, I want to see payroll totals and drill into each employee's breakdown, so that I can approve confidently.
73. As an HR, I want the approved payroll period locked, and any change after lock to require an audited Admin unlock, so that payroll integrity is protected.
74. As an employee, I want to view and download my payslip (PDF) with every earning, deduction, insurance and tax line, so that I understand my pay.
75. As an Accountant, I want to export a bank transfer file (Excel, one bank's format), so that I can upload it to internet banking.
76. As a PM/Accountant, I want a separately calculated commission that is taxed together with salary but paid separately. *(P1)*

### Cổng nhân viên (self-service)
77. As an employee, I want to view my profile and submit edits (contacts, dependents, skills) for HR approval, so that my data stays current.
78. As an employee, I want to see my projects, allocations and log timesheets, so that my project work is in one place.
79. As an employee, I want to see my monthly attendance calendar, so that I can spot missing punches early.
80. As an employee, I want to request leave and OT and track status, so that I don't need paper forms.
81. As an employee, I want to view my payslips, so that I don't have to ask HR.
82. As an employee, I want the self-service screens to work on my phone browser, so that I can use them anywhere.

### Dashboard & báo cáo
83. As an HR/Director, I want a dashboard (headcount, present/absent/on-leave today, pending approvals with quick approve, expiring contracts/visas, monthly payroll cost trend, utilization, bench), so that I see the organization's state at a glance.
84. As an HR, I want reports exportable to Excel (Employee list, Headcount movement & turnover, Leave, Attendance summary, Payroll summary, Project allocation & utilization), so that I can share data with management.
85. As a presenter, I want seeded realistic data (Vietnamese names, departments, projects, salaries; 150–700 employees; heatmap with free/balanced/overloaded people), so that the demo looks like the client's own company.

## Implementation Decisions

### Kiến trúc & công nghệ
- **Tech stack đã chốt** (ADR 0001): Spring Boot + React/TypeScript/Vite + Tailwind/shadcn + PostgreSQL, xác thực JWT. Danh sách thư viện ở phần Comments của #00.
- **Kiến trúc** (ADR 0002): modular monolith với Spring Modulith, mỗi context một schema PostgreSQL. Context đọc dữ liệu của nhau qua API công khai của module, thông báo thay đổi bằng sự kiện nội bộ.
- **Ranh giới lương** (ADR 0004): `payroll` chỉ đọc **Hồ sơ lương** do `people` cung cấp, không đọc hợp đồng.
- **Kiến trúc không phụ thuộc stack:** mã nguồn chia theo 5 context (`org`, `people`, `time`, `payroll`, `projects`). Mỗi context sở hữu dữ liệu và API của mình. Các module sâu là logic thuần, tách khỏi framework và DB.

### Một Pháp nhân, giữ đường mở rộng (ADR 0003)
- Demo có đúng một Pháp nhân, được tạo lúc cài đặt, không có giao diện tạo hay chuyển Pháp nhân.
- Các bảng gốc (nhân viên, đơn vị tổ chức, kỳ công, kỳ lương, dự án, tham số) gắn `legal_entity_id`, và việc lọc được áp dụng tập trung ở tầng truy cập dữ liệu. Nhờ vậy sau này bật được đa công ty mà không phải viết lại.

### Tham số có ngày hiệu lực
- Tham số lương, BHXH, thuế TNCN, đơn giá, chính sách phép lưu dạng bản ghi có `EffectiveFrom`/`EffectiveTo`.
- Khi tính toán luôn chọn bản ghi có hiệu lực tại ngày của kỳ.
- Dữ liệu seed dùng quy định hiện hành. Giá trị phải được kiểm lại trước khi demo.

### Các module sâu
Mỗi module là logic thuần, không phụ thuộc DB hay HTTP. Tầng API/ứng dụng tự nạp dữ liệu, gọi module rồi lưu kết quả.

1. **Máy tính lương** (payroll)
   - Input: hồ sơ lương của nhân viên (lương HĐ, lương đóng BH, các thành phần), bảng công đã khóa (công chuẩn, công thực tế, giờ OT theo loại ngày), người phụ thuộc, bộ tham số có hiệu lực, các khoản điều chỉnh của kỳ.
   - Output: dòng lương chi tiết (từng khoản thu nhập và khấu trừ, gross, BH phần NLĐ và phần DN, thu nhập chịu thuế, giảm trừ, thuế TNCN, net) kèm danh sách cảnh báo.
   - Quy tắc làm tròn tiền tệ phải nhất quán và được chốt trong module.
2. **Bộ xử lý chấm công** (time)
   - Input: log quẹt thẻ thô, lịch ca đã phân, định nghĩa ca, quy tắc (dung sai, làm tròn), đơn OT và đơn bổ sung công đã duyệt, ngày nghỉ phép đã duyệt, ngày lễ.
   - Output: bản ghi công từng ngày (giờ vào/ra đã ghép, phút làm, trễ/sớm, thiếu quẹt, vắng, phút OT được tính) và bảng tổng hợp tháng.
   - Ca qua đêm được gán về ngày bắt đầu ca.
3. **Chính sách phép** (time)
   - Input: chính sách, ngày vào làm/thâm niên, các đơn (đã duyệt, đang chờ), số tồn năm trước.
   - Output: số dư theo loại phép (được cấp, đã dùng, đang chờ, còn lại) và kiểm tra đơn mới có hợp lệ không.
   - Đơn vị nhỏ nhất là nửa ngày. Bỏ qua cuối tuần và ngày lễ theo lịch làm việc.
4. **Bộ tính phân bổ** (projects)
   - Input: các phân bổ (`EmployeeId`, `ProjectId`, `Role`, `Percent`, `From`, `To`), kỳ xem (tuần/tháng), nghỉ phép (tùy chọn).
   - Output: **Tải phân bổ** theo người theo kỳ, danh sách vi phạm vượt 100%, ma trận heatmap, **Bench**, **Sắp hết dự án**. **Utilization** (giờ timesheet đã duyệt / giờ khả dụng) được tính riêng, vì cần timesheet và nghỉ phép.
   - Có thêm hàm "thử phân bổ" để kiểm tra một phân bổ mới trước khi lưu.
5. **Luồng phê duyệt** (org)
   - Một máy trạng thái dùng chung cho mọi loại yêu cầu. Trạng thái: `Draft → Pending(level n) → Approved | Rejected | ReturnedForInfo | Cancelled`, tối đa 3 cấp.
   - Người duyệt mỗi cấp được xác định theo quy tắc: line manager, PM của dự án, hoặc một vai trò cụ thể.
   - Tự duyệt sau N ngày. Mỗi lần chuyển trạng thái phát ra một sự kiện (dùng cho thông báo, audit, và cập nhật số dư phép/bảng công).
   - Loại yêu cầu cắm vào qua một interface nhỏ: xác định người duyệt, và xử lý khi trạng thái cuối được chốt.
6. **Phạm vi truy cập** (org)
   - Input: người dùng, các vai trò.
   - Output: bộ lọc dữ liệu (phòng ban quản lý; dự án quản lý; bản thân) và các quyền chức năng.
   - Được dùng tập trung ở tầng truy vấn và ở UI (ẩn menu/nút không có quyền).

### Các phần mỏng
- **CRUD danh mục, hồ sơ, hợp đồng, dự án.**
- **Import CSV/Excel** (nhân viên, log chấm công), báo lỗi theo từng dòng.
- **Xuất file:** HĐ từ template, phiếu lương, file ngân hàng, báo cáo.
- **Thông báo:** trong app và email, gửi qua SMTP.
- **Audit log:** ghi tự động trên các thực thể nhạy cảm (lương, công, phân bổ, phê duyệt, tham số) với các trường ai / lúc nào / trước → sau.

### Hợp đồng dữ liệu & API
- REST API theo tài nguyên của từng context.
- Kỳ lương và kỳ công có trạng thái `Open → Calculated → PendingApproval → Approved/Locked`.
- Tính lương chỉ được chạy trên kỳ công đã `Locked`.
- Mở khóa kỳ lương cần quyền Admin và được ghi audit.

## Testing Decisions

- **Nguyên tắc:** chỉ test hành vi quan sát được từ bên ngoài qua giao diện công khai của module (input → output). Không test chi tiết cài đặt bên trong. Mỗi test là một tình huống nghiệp vụ có tên rõ ràng, dùng thuật ngữ của CONTEXT-MAP.
- **Unit test (dạng table-driven, dựa trên các ví dụ tính tay) cho 6 module sâu:**
  1. **Máy tính lương:**
     - lương đủ công và thiếu công
     - OT ngày thường/cuối tuần/lễ
     - phụ cấp chịu thuế và không chịu thuế, có quy đổi theo ngày công
     - lương đóng BH vượt trần
     - thuế tại từng bậc lũy tiến, có và không có người phụ thuộc
     - tạm ứng và khấu trừ, cảnh báo net ≤ 0
     - làm tròn
  2. **Bộ xử lý chấm công:**
     - ca hành chính đúng giờ, trễ, về sớm
     - thiếu quẹt vào hoặc ra
     - quẹt trùng
     - ca đêm qua ngày
     - OT đã duyệt và OT không được duyệt
     - ngày nghỉ phép và ngày lễ
     - đơn bổ sung công đã duyệt
  3. **Chính sách phép:**
     - cấp phép theo thâm niên
     - nghỉ nửa ngày
     - đơn đi qua cuối tuần hoặc ngày lễ
     - vượt số dư
     - chuyển phép tồn cuối năm
     - hủy đơn đã duyệt
  4. **Bộ tính phân bổ:**
     - các khoảng thời gian chồng lấn
     - đúng 100% và vượt 100%
     - phân bổ bắt đầu hoặc kết thúc giữa kỳ
     - bench
     - utilization
     - "thử phân bổ"
  5. **Luồng phê duyệt:**
     - 1, 2 và 3 cấp
     - từ chối giữa chừng
     - trả về để bổ sung thông tin
     - tự duyệt sau N ngày
     - người không đúng cấp không được duyệt
     - sự kiện phát ra đúng khi chốt trạng thái cuối
  6. **Phạm vi truy cập:**
     - manager chỉ thấy phòng mình
     - PM chỉ thấy dự án mình
     - nhân viên chỉ thấy bản thân
- **API integration test** chạy với database thật trong container (PostgreSQL qua Testcontainers), qua các luồng demo chính:
  - tạo nhân viên → HĐ
  - xin nghỉ nửa ngày → duyệt → số dư giảm
  - import log → khóa công → tính lương → duyệt 3 cấp → khóa → phiếu lương và file ngân hàng
  - phân bổ vượt 100% bị cảnh báo
  - nhân viên không truy cập được dữ liệu của người khác
- **Prior art:** repo chưa có code. Các mẫu test đầu tiên của từng loại sẽ làm prior art cho những test sau.

## Out of Scope

Thuộc giai đoạn sau khi khách chốt, xem mục Planning trong `HRM_Demo_Features.md`:
- **Dự án nâng cao:** Gantt/milestone, dự báo nguồn lực, P&L dự án, billing, tích hợp Jira/MS Project/Azure DevOps.
- **KPI và đánh giá nhân viên:** gồm cả đánh giá sau dự án.
- **Tuyển dụng đầy đủ:** đặt lịch phỏng vấn, thư mời nhận việc, tích hợp job board. *(Tuyển dụng cơ bản dạng Kanban là P1 tùy chọn.)*
- **Các module khác:** công tác, Talent Management, Portal nội bộ, Onboarding/Offboarding, đào tạo, sức khỏe/bảo hộ lao động, tài sản nhân viên.
- **Tích hợp ngoài:** HĐLĐ điện tử/chữ ký số, SSO (Entra ID/Google), API BHXH/eTax, SDK máy chấm công, phần mềm kế toán, nhiều ngân hàng.
- **Nghiệp vụ lương nâng cao:** quyết toán thuế TNCN năm, đủ bộ tờ khai BHXH, trả phép tồn thành tiền, truy thu/truy lĩnh, quy trình khiếu nại lương.
- **Đa công ty / tập đoàn:** nhiều Pháp nhân, chuyển công ty, nhân viên thuộc nhiều công ty, báo cáo hợp nhất.
- **Nền tảng mở rộng:** mobile app native, chuyển dữ liệu lịch sử, luồng duyệt hơn 3 cấp, đa tiền tệ, mã hóa trường nhạy cảm theo Nghị định 13/2023, audit lưu dài hạn.
- **P1 trong PRD này** chỉ làm nếu kịp tiến độ: chi phí nhân sự dự án, yêu cầu nhân sự cho dự án, commission, lương sản phẩm.

## Further Notes

- **Mốc tiến độ:**
  - **Demo v1 (tuần 4):** org + people + projects + leave + dashboard v1.
  - **Demo v2 (tuần 8):** thêm time (chấm công, timesheet) + payroll + báo cáo.
  - Thứ tự issue nên bám theo mốc này.
- **Rủi ro lớn nhất là công thức lương.** Máy tính lương phải là module thuần có bộ test dày đặc. Tham số lấy từ cấu hình, không hard-code.
- **Kiểm tra tham số thuế và BHXH:** bảng thuế TNCN, mức giảm trừ gia cảnh, trần đóng BHXH và lương tối thiểu vùng phải được đối chiếu với quy định hiện hành trước buổi demo.
- **Cá nhân hóa theo khách:** logo lấy từ `brand/`. Seed dữ liệu cho một công ty theo từng kịch bản (dịch vụ/dự án, sản xuất). Seed data và nút "Demo as…" là một phần của deliverable, không phải việc phụ.
- **Thuật ngữ và quyết định:** glossary của từng context ở `docs/contexts/<context>/CONTEXT.md`, ADR ở `docs/adr/`. Thuật ngữ hoặc quyết định mới phải được ghi lại (qua `/grill-with-docs`).
