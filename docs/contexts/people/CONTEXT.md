# People

Hồ sơ nhân sự và vòng đời làm việc của một người tại Pháp nhân: từ lúc vào làm, qua hợp đồng, điều chuyển, đến khi nghỉ việc.

## Language

**Nhân viên**:
Hồ sơ nhân sự của một người làm việc cho **Pháp nhân**, gồm cả người đang thử việc và người đã nghỉ việc (trạng thái Inactive). Có 0 hoặc 1 **Tài khoản**.
_Avoid_: người dùng, user, tài khoản (khi nói về hồ sơ)

**Mã nhân viên**:
The code that identifies a **Nhân viên** in the company: `NV` followed by at least five digits (`NV00001` … `NV99999`, then `NV100000`). The server issues the next free code when the Employee is saved; it is never typed in, edited or reused. API field `code`; the form only shows a preview (`GET /api/employees/next-code`).
_Avoid_: mã NV tự nhập, employee ID (the internal `id` is a UUID)

**Trạng thái nhân viên**:
Where a **Nhân viên** stands in their working life at the company:
- **Thử việc** (`PROBATION`): the default when an Employee is added.
- **Chính thức** (`OFFICIAL`).
- **Đã nghỉ việc** (`INACTIVE`): set only by the resignation flow (HRM-11), which also locks the **Tài khoản**. It is never set on create or by editing.
"Active" means any status other than `INACTIVE`. From HRM-10/11 on, Thử việc and Chính thức are derived from the **Chứng từ nhân sự** (probation document, contract).
_Avoid_: active/inactive as the only two states, "đang làm" (ambiguous)

**Nhập nhân viên từ Excel** (Employee import):
Adding many **Nhân viên** at once from the company's Excel template (HRM-07): the file is checked first, then the valid rows are created in one go, each with a new **Mã nhân viên**. A row is **Hợp lệ** (`VALID`), **Lỗi** (`INVALID`, with the failing cells), or **Đã có** (`EXISTING`): its Mã nhân viên, or else its CCCD, already belongs to an Employee. An import never changes an existing profile.
_Avoid_: đồng bộ, cập nhật hàng loạt (an import only adds)

**Trường nhạy cảm**:
The identity numbers on a **Nhân viên**'s profile: số CCCD (`idNumber`, 12 digits, required, unique in the company), MST (`taxCode`) and số BHXH (`socialInsuranceNumber`). Since 01/07/2025 the MST and the số BHXH of a person are their CCCD number, so each is either an old 10-digit code or the 12-digit CCCD number. Without the permission `EMPLOYEE_SENSITIVE_VIEW` they are shown masked: every digit except the last four becomes `•`. A **Nhân viên** always sees their own numbers unmasked. The issue date and place of the CCCD (`idIssueDate`, `idIssuePlace`) belong to the same part of the profile but are not masked.
_Avoid_: dữ liệu mật, PII (too broad)

**Cập nhật hồ sơ** (Profile update):
A **Nhân viên** asks to change the contact fields of their own profile (email cá nhân, số điện thoại, địa chỉ, người liên hệ khẩn cấp) through a **Yêu cầu phê duyệt** of type `PROFILE_UPDATE` (HRM-12). The profile takes the new values only when the last level approves (an approver or **Tự duyệt**); only the changed fields are written, so edits HR made meanwhile to other fields stay. **Từ chối**, **Trả về để bổ sung** and cancelling leave the profile as it is. While it is returned, the sender may change the proposal and send it again. One open request per Nhân viên at a time. HR still edits a profile directly. In code `ProfileUpdateRequest`, API `/api/profile-update-requests`.
_Avoid_: yêu cầu sửa thông tin, đề nghị thay đổi

**Employee skill**:
A catalog Skill assigned to one Employee with one proficiency level from 1 to 5. An Employee has at most one record for each catalog Skill. Existing records keep a deactivated catalog Skill visible; new assignments require an active Skill. The Employee list can filter by Skill and minimum level for future project staffing (HRM-16).

**Employee certificate**:
A named qualification with optional issuer, issue date and expiry date. Its optional file is a private Employee attachment belonging to the same Employee; downloading it follows the attachment access rules. Expiry dates are available for HRM-14 alerts.

**Quản lý trực tiếp**:
**Nhân viên** được gán trên hồ sơ để duyệt các đơn theo tổ chức (nghỉ phép, OT, bổ sung công) của một Nhân viên. Mặc định là **Trưởng đơn vị**, HR có thể gán người khác.
_Avoid_: line manager (trong tài liệu tiếng Việt), sếp, PM

**Hồ sơ lương**:
Chuỗi các bản ghi có ngày hiệu lực của một **Nhân viên**. Mỗi bản ghi gồm mức lương, **Lương đóng BH**, danh sách phụ cấp, cờ có đóng BH hay không, và **Cách tính thuế**. Là nguồn duy nhất mà tính lương đọc.
_Avoid_: lương hợp đồng, salary (khi nói về nguồn tính lương)

**Chứng từ nhân sự**:
Văn bản làm thay đổi quan hệ lao động hoặc điều kiện làm việc: hợp đồng, phụ lục hợp đồng, quyết định (bổ nhiệm, điều chuyển, điều chỉnh lương, khen thưởng, kỷ luật, nghỉ việc).
_Avoid_: giấy tờ (giấy tờ là CCCD, visa, bằng cấp…)

**Thử việc**:
Giai đoạn làm việc thử theo một **Chứng từ nhân sự**: hoặc HĐ thử việc riêng (mặc định không đóng BH, thuế khấu trừ 10%), hoặc HĐLĐ có điều khoản thử việc (mặc định đóng BH, thuế lũy tiến). Kết quả là Đạt, Không đạt, hoặc Gia hạn.
An immutable **Probation evaluation** records the period, evaluator and outcome against its source contract. The source is either a separate probation contract or a formal labor contract with paired probation-clause dates within its term. A Pass on a separate probation contract suggests a formal contract starting after that contract ends, using the salary profile effective on the evaluation date; saving the suggestion still uses the contract API. A Pass on a formal contract's clause does not suggest another contract.
_Avoid_: probation (trong tài liệu tiếng Việt), học việc

## Relationships

- A **Nhân viên** belongs to at most one **Đơn vị tổ chức** at a time. An Employee with no unit sits directly under the company (e.g. the Giám đốc); only Accounts with company-wide data scope see them.
- A **Nhân viên** has at most one **Quản lý trực tiếp**. When HR has not chosen one, it follows the org tree live: the **Trưởng đơn vị** of the Employee's unit, or, when the Employee is that head or the unit has no active head, of the nearest unit above. An Employee directly under the company, or the head of a top-level unit, then has none. **PM** is not a Quản lý trực tiếp and does not approve organisational requests.
- Mỗi thay đổi lương hoặc phụ cấp phải đi qua một **Chứng từ nhân sự**, và Chứng từ đó tạo ra một bản ghi **Hồ sơ lương** mới. Không sửa Hồ sơ lương trực tiếp.
- Nghỉ việc không xóa **Nhân viên**. Hồ sơ chuyển sang Inactive, và **Tài khoản** gắn với hồ sơ bị khóa.
  An immutable **Resignation** records the last working day, reason and actor. It sets the Employee to `INACTIVE`, locks a linked Account and ends its sessions in one transaction. An Employee who left remains available through an explicit `INACTIVE` filter and historical profile reads.

## Example dialogue

> **Dev:** Anh IT thuê ngoài có cần tạo hồ sơ Nhân viên không?
> **HR:** Không. Chỉ cần một **Tài khoản** quản trị, không gắn với **Nhân viên** nào.
