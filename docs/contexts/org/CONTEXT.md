# Org

Nền tảng tổ chức: công ty sở hữu dữ liệu, cơ cấu tổ chức, người dùng và phân quyền, luồng phê duyệt.

## Language

**Pháp nhân**:
Đơn vị có mã số thuế riêng, ký HĐLĐ, chạy lương, đóng BHXH và nộp thuế. Là chủ sở hữu mọi dữ liệu nghiệp vụ. Demo có đúng một Pháp nhân; trên giao diện hiển thị là "Công ty".
_Avoid_: tenant, company (trong code dùng legal entity), đơn vị

**Đơn vị tổ chức**:
Một nút trong cây tổ chức của Pháp nhân: phòng ban, nhóm/tổ, hoặc chi nhánh hạch toán phụ thuộc.
_Avoid_: bộ phận (khi nói chung), công ty (cho chi nhánh)
In code `OrgUnit`. Each unit has a **Mã đơn vị** (unit code: 2–10 characters, unique in the Pháp nhân) and a **Loại** (type: Chi nhánh `BRANCH`, Phòng ban `DEPARTMENT`, Nhóm `TEAM`), which is a label only and sets no nesting rule. The Pháp nhân is the top of the tree but is not itself a Đơn vị tổ chức. A unit is **ngừng hoạt động** (deactivated) rather than deleted while it still has employees or child units.

**Trưởng đơn vị**:
**Nhân viên** đứng đầu một **Đơn vị tổ chức**. Mặc định là **Quản lý trực tiếp** của các thành viên trong đơn vị.
_Avoid_: trưởng phòng (khi nói chung cho mọi cấp)

**Tài khoản**:
Danh tính dùng để đăng nhập, mang một hoặc nhiều vai trò. Gắn với 0 hoặc 1 **Nhân viên** (Tài khoản không gắn Nhân viên chỉ dùng cho quản trị hệ thống). Đăng nhập bằng mã nhân viên hoặc email.
_Avoid_: người dùng/user khi đang nói về hồ sơ nhân sự

**Persona demo** (Demo persona):
A **Tài khoản** seeded for the "Demo as…" switch, one per role and named after it (`ADMIN`, `HR`, `LINE_MANAGER`, …). It exists only where the demo flag is on, cannot be edited or given a password, and does not count as an Admin of the company.
_Avoid_: test user, fake account

**Danh mục** (Catalog):
A list the company configures without code changes, shared by the features that offer its items: **Chức danh** (position), **Loại hợp đồng** (contract type, with how long it runs: indefinite, fixed-term up to 36 months, or probation), **Loại phụ cấp** (allowance type, with whether it counts towards social insurance and personal income tax), **Ngày lễ** (holiday: a range of days off, no code), **Kỹ năng** (skill) and **Vai trò dự án** (project role). An item has a code (not holidays) and a name, both unique within its catalog (a holiday name within its year, since holidays come back every year). Every company starts with **giá trị mặc định** (defaults), seeded once per set (in code `CatalogDefaults`), so a default the company deleted does not come back; each year's holidays are a set of their own. An item another record refers to is **ngừng hoạt động** (deactivated) rather than deleted: it stays on those records and is no longer offered. Leave types and shifts carry rules and are not catalogs.
In code `Catalog` / `CatalogItem`.
_Avoid_: master data, lookup table, dictionary

**Yêu cầu phê duyệt**:
Một đơn (nghỉ phép, OT, bổ sung công, timesheet, bảng lương, cập nhật hồ sơ) đi qua tối đa 3 cấp duyệt. Kết thúc ở một trong các trạng thái: Đã duyệt, Bị từ chối, hoặc Đã hủy.
_Avoid_: request, ticket, đơn từ

**Từ chối**:
Kết thúc **Yêu cầu phê duyệt** ở bất kỳ cấp nào. Muốn gửi lại phải chỉnh sửa và đi lại từ cấp 1.
_Avoid_: reject (trong tài liệu tiếng Việt), trả về

**Trả về để bổ sung**:
Tạm dừng **Yêu cầu phê duyệt** để người gửi bổ sung thông tin. Khi gửi lại, đơn tiếp tục từ đúng cấp đã trả về.
_Avoid_: từ chối

**Ủy quyền duyệt**:
Người duyệt giao quyền duyệt cho một **Nhân viên** khác trong một khoảng ngày. Áp dụng cho cả đơn mới lẫn đơn đang chờ, và nhật ký ghi rõ duyệt thay ai.
_Avoid_: delegate, duyệt hộ

**Phạm vi truy cập** (Access scope):
What a **Tài khoản** may see and do, derived from its roles: a data scope (`SELF` = own records only; `ORG_UNIT` = also the records of the **Đơn vị tổ chức** the Account's **Nhân viên** heads as **Trưởng đơn vị**, and of every unit below them; `COMPANY` = the whole **Pháp nhân**; a per-project scope comes with HRM-15) plus a set of feature permissions (e.g. `COMPANY_EDIT`). Computed in one place and used by both queries and the UI. The permissions of each role have defaults in code and an Admin may change them per **Pháp nhân** on the role matrix (stored as differences from the defaults); the data scope of a role is fixed, the Admin role always has every permission, and the base permissions (`COMPANY_VIEW`, `ACCOUNT_VIEW`) belong to every **Tài khoản**.
_Avoid_: ad hoc role checks in controllers or components

## Relationships

- Một **Pháp nhân** có một cây **Đơn vị tổ chức** nhiều cấp.
- Tài khoản của **Nhân viên** bị khóa tự động vào ngày làm việc cuối cùng.
- Không ai duyệt **Yêu cầu phê duyệt** của chính mình. Khi người duyệt trùng người gửi, đơn tự đẩy lên cấp trên theo cây tổ chức, và cuối cùng đến vai trò HR.
- Chi nhánh dùng chung mã số thuế với công ty là **Đơn vị tổ chức**, không phải **Pháp nhân**.
- The UI and the API path say "company" (`/api/company`, "Thông tin công ty") for the **Pháp nhân**; entities, tables and services say `LegalEntity`.

## Example dialogue

> **Dev:** Chi nhánh Đà Nẵng có tách bảng lương riêng không?
> **HR:** Không, chi nhánh dùng chung mã số thuế với công ty nên chỉ là một **Đơn vị tổ chức**. Bảng lương vẫn chạy chung cho cả **Pháp nhân**.
