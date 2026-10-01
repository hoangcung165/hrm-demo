Status: ready-for-human
Type: HITL

# #00 Chọn tech stack

## Parent

`.scratch/hrm-demo/PRD.md` — mục Implementation Decisions › Kiến trúc & công nghệ

## What to build

Chọn tech stack cho app HRM demo rồi ghi quyết định thành ADR `docs/adr/0001-tech-stack.md`. Đây là quyết định của người (HITL). Agent có thể hỗ trợ bằng cách so sánh các phương án hoặc dựng prototype nhỏ.

Stack phải đáp ứng các yêu cầu sau:
- **Web app responsive:** màn hình self-service dùng tốt trên điện thoại.
- **Song ngữ vi/en.**
- **Biểu đồ và heatmap:** hiển thị mượt với khoảng 700 nhân viên × 12 tuần.
- **API có xác thực và phân quyền theo vai trò.** Dữ liệu được lọc theo phạm vi truy cập ở một chỗ tập trung.
- **Cơ sở dữ liệu quan hệ:** có transaction, xử lý tốt kiểu tiền tệ và ngày tháng.
- **Job chạy nền:** tự duyệt đơn, cảnh báo hết hạn, chuyển phép tồn.
- **Gửi email:** dùng SMTP.
- **Xuất file:** Excel, Word (điền dữ liệu vào template HĐ) và PDF (phiếu lương).
- **Kiểm thử:** unit test cho module thuần, integration test chạy với database thật trong container.
- **Đóng gói và deploy:** chạy toàn bộ bằng một lệnh, deploy lên một URL demo.
- **Có đường lên production**, kể cả khi khách yêu cầu triển khai tại chỗ (on-prem).

Các tiêu chí dùng để cân nhắc:
1. Kỹ năng hiện có của đội.
2. Tốc độ ra được demo trong 8 tuần.
3. Tái sử dụng được cho bản production.
4. Hạ tầng phía khách hàng: Windows on-prem hay cloud.
5. Dễ tuyển người.
6. Mức độ AI agent làm việc hiệu quả với stack đó.
7. Hệ sinh thái thư viện cho xuất Excel/Word/PDF và cho tiếng Việt.

Một số phương án tham khảo (danh sách chưa đầy đủ):
- **A. React + TypeScript / .NET / SQL Server.** Hợp với khách dùng hạ tầng Windows và doanh nghiệp truyền thống.
- **B. React + TypeScript / Node (NestJS) / PostgreSQL.** Dùng một ngôn ngữ TypeScript cho cả frontend và backend.
- **C. Next.js full-stack (TypeScript) / PostgreSQL.** Ít ranh giới giữa các tầng nên nhanh ra demo, nhưng phần backend khó tách riêng khi lên production.
- **D. React + TypeScript / Java Spring Boot / PostgreSQL.** Phổ biến ở khách enterprise, nhưng dựng khung chậm hơn.

## Acceptance criteria

- [x] Có bảng so sánh các phương án theo 7 tiêu chí ở trên
- [x] Đã chốt stack cho frontend, backend, database, xác thực, job nền, xuất file, i18n, biểu đồ, test và deploy
- [x] ADR `docs/adr/0001-tech-stack.md` ghi quyết định, lý do chọn và các phương án đã loại
- [x] Tất cả issue từ #01 trở đi tham chiếu ADR này; không cần sửa lại nội dung từng issue

## Blocked by

None - can start immediately

## Comments

**Đã chốt (grill session):** xem `docs/adr/0001-tech-stack.md` và `docs/adr/0002-modular-monolith.md`.

Các thư viện dưới đây dễ thay đổi sau này nên không ghi thành ADR riêng:
- **Frontend:**
  - Tailwind + shadcn/ui
  - TanStack Table, TanStack Query + client sinh từ OpenAPI (springdoc)
  - react-hook-form + zod, react-day-picker, FullCalendar
  - Apache ECharts, react-i18next
- **Backend:**
  - Gradle
  - Spring `@Scheduled` + ShedLock, Spring Mail + Mailpit (email mẫu viết bằng Thymeleaf)
  - Apache POI (Excel), poi-tl (Word theo template), OpenHTMLtoPDF (PDF), `MessageSource` cho i18n
- **Test:**
  - JUnit 5 + AssertJ, Testcontainers (PostgreSQL), Spring Modulith test
  - Vitest, Playwright
- **Chạy:** frontend build vào jar của Spring Boot. Docker Compose gồm app, PostgreSQL và Mailpit.
