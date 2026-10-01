# Modular monolith với Spring Modulith, mỗi context một schema

Backend là **một ứng dụng Spring Boot duy nhất**. Mỗi context (`org`, `people`, `time`, `payroll`, `projects`) là một module có ranh giới rõ, được Spring Modulith kiểm tra bằng test. Tất cả dùng chung một PostgreSQL, nhưng **mỗi context có schema riêng**.

Chúng tôi chọn cách này thay cho microservices vì:
- Demo 8 tuần với đội nhỏ, và cài on-prem cho khách, cần một thứ duy nhất để deploy.
- Các nghiệp vụ như khóa kỳ công rồi tính lương cần transaction đơn giản, không phải giao dịch phân tán.

## Consequences

- **Đọc dữ liệu của context khác** chỉ qua API công khai của module đó. **Không bao giờ truy vấn thẳng bảng hoặc schema của context khác.**
- **Thay đổi trạng thái** được thông báo bằng sự kiện nội bộ. Ví dụ luồng phê duyệt phát sự kiện "đã duyệt" thì `time` cập nhật số dư phép.
- **Tách ra microservice sau này vẫn làm được**, vì ranh giới giữa các module đã được giữ ngay từ đầu.
