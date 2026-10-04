# Tech stack: Spring Boot + React (Vite) + PostgreSQL

Backend dùng **Java Spring Boot** vì đây là thế mạnh của đội: trong 8 tuần làm demo, tốc độ đến từ kỹ năng sẵn có, không đến từ stack "tốt nhất trên giấy". Frontend là **React + TypeScript + Vite + React Router** (SPA) gọi REST API của Spring. Database là **PostgreSQL**, truy cập qua JPA/Hibernate, migration bằng Flyway.

**Xác thực** dùng Spring Security với **JWT tự phát hành**. Người dùng và vai trò lưu trong DB của app. Chọn JWT (stateless) để sau này mobile app native và các tích hợp ngoài dùng chung một cơ chế với web. Khi cần SSO (Entra ID/Google) thì app đổi danh tính SSO lấy JWT của chính app.

## Considered Options

- **Next.js thay cho React + Vite: loại.** HRM là app nội bộ, không cần SEO hay render phía server. Server riêng của Next dễ khiến logic nghiệp vụ bị tách đôi với Spring. Deploy on-prem sẽ phải chạy thêm runtime Node. SPA build ra file tĩnh thì đóng gói chung vào jar của Spring Boot được (1 artifact).
- **Thymeleaf/HTMX hoặc Vaadin: loại.** Khó làm heatmap, lịch và biểu đồ tương tác, cùng trải nghiệm mobile đủ đẹp cho một buổi demo bán hàng.
- **Session cookie: loại.** Đơn giản hơn cho SPA cùng origin, nhưng không dùng lại được cho mobile app native và các tích hợp ngoài.
- **Keycloak: loại.** Thêm một server phải vận hành, quá nặng cho demo và cài on-prem.
- **SQL Server: loại.** Tốn phí license, image test nặng. PostgreSQL có kiểu `numeric` cho tiền và `daterange` cho dữ liệu có ngày hiệu lực.

## Consequences

- **Giữ đường chuyển sang SQL Server** nếu khách bắt buộc: không dùng SQL đặc thù PostgreSQL trong logic nghiệp vụ.
- **Kiến trúc REST 3 tầng** Controller → Service → Repository (ADR 0002), dùng các thư viện Spring phổ biến: Security, Data JPA, Validation, Mail… Danh sách đầy đủ ở comment "Danh sách thư viện, cập nhật 04/10/2026" trên issue HRM-00.
- **Logic nghiệp vụ lõi** (lương, chấm công, phép, phân bổ, luồng duyệt, phạm vi truy cập) nằm ở tầng service, có unit test (JUnit + Mockito) và integration test với PostgreSQL qua Testcontainers.
- **Trang public cần SEO** (tuyển dụng, landing page), nếu có sau này, làm riêng, không nằm trong SPA này.
- **Thiết kế JWT:**
  - **Access token** sống 15 phút, chứa `userId` và vai trò. Frontend chỉ giữ trong bộ nhớ, không lưu vào localStorage.
  - **Refresh token** sống 7 ngày, nằm trong cookie HttpOnly (với mobile thì trả trong body). Được lưu dạng hash trong DB và đổi token mới sau mỗi lần dùng. Nếu một refresh token cũ bị dùng lại thì thu hồi cả chuỗi.
  - **Khóa tài khoản, đăng xuất, đổi mật khẩu** xóa refresh token, nên người dùng bị đẩy ra trong tối đa 15 phút.
  - **Phạm vi dữ liệu** luôn được xác định từ token ở phía server, không dựa vào tham số từ client.
  - **"Demo as…"** là endpoint chỉ bật ở môi trường demo.
