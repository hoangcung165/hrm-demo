# People

Hồ sơ nhân sự và vòng đời làm việc của một người tại Pháp nhân: từ lúc vào làm, qua hợp đồng, điều chuyển, đến khi nghỉ việc.

## Language

**Nhân viên**:
Hồ sơ nhân sự của một người làm việc cho **Pháp nhân**, gồm cả người đang thử việc và người đã nghỉ việc (trạng thái Inactive). Có 0 hoặc 1 **Tài khoản**.
_Avoid_: người dùng, user, tài khoản (khi nói về hồ sơ)

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
_Avoid_: probation (trong tài liệu tiếng Việt), học việc

## Relationships

- Một **Nhân viên** thuộc đúng một **Đơn vị tổ chức** tại một thời điểm.
- Mỗi **Nhân viên** có đúng một **Quản lý trực tiếp**. **PM** không phải là Quản lý trực tiếp, và không duyệt đơn theo tổ chức.
- Mỗi thay đổi lương hoặc phụ cấp phải đi qua một **Chứng từ nhân sự**, và Chứng từ đó tạo ra một bản ghi **Hồ sơ lương** mới. Không sửa Hồ sơ lương trực tiếp.
- Nghỉ việc không xóa **Nhân viên**. Hồ sơ chuyển sang Inactive, và **Tài khoản** gắn với hồ sơ bị khóa.

## Example dialogue

> **Dev:** Anh IT thuê ngoài có cần tạo hồ sơ Nhân viên không?
> **HR:** Không. Chỉ cần một **Tài khoản** quản trị, không gắn với **Nhân viên** nào.
