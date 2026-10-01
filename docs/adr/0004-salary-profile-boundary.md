# Tính lương chỉ đọc Hồ sơ lương, không đọc hợp đồng

Context `payroll` lấy lương và phụ cấp của **một nguồn duy nhất**: **Hồ sơ lương** do context `people` cung cấp. Hồ sơ lương là chuỗi bản ghi có ngày hiệu lực. `payroll` không đọc hợp đồng, phụ lục hay quyết định.

Các Chứng từ nhân sự đó, khi được lưu, **tạo ra** bản ghi Hồ sơ lương. Lý do: lương thay đổi qua nhiều loại chứng từ (phụ lục HĐ, quyết định bổ nhiệm, quyết định điều chỉnh lương). Nếu `payroll` phải hiểu từng loại chứng từ thì hai context bị ràng buộc chặt với nhau, và việc tính lương theo Đoạn hiệu lực trở nên phức tạp.

**Không sửa Hồ sơ lương trực tiếp.** Mọi thay đổi phải đi qua một chứng từ và được ghi audit.
