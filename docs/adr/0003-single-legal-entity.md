# Demo cho một Pháp nhân, nhưng giữ sẵn `legal_entity_id`

Demo và giai đoạn đầu chỉ phục vụ **một công ty (một Pháp nhân)**: không có giao diện tạo, quản lý hay chuyển giữa các Pháp nhân. Dù vậy, các bảng gốc (nhân viên, đơn vị tổ chức, kỳ công, kỳ lương, dự án, tham số) **vẫn có cột `legal_entity_id`**, và việc lọc theo Pháp nhân được áp dụng tập trung ở tầng truy cập dữ liệu.

Chi phí của việc giữ cột này gần như bằng không. Ngược lại, nếu bỏ hẳn thì khi gặp khách là tập đoàn nhiều công ty con, toàn bộ schema và mọi truy vấn phải sửa lại.

Vì vậy, **đừng xóa cột này với lý do "không dùng tới"**. Đa công ty đã được đưa vào danh sách Planning.
