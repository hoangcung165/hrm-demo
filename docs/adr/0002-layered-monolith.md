# Monolith Spring Boot phân tầng, một schema

Backend là **một ứng dụng Spring Boot duy nhất**, theo kiến trúc REST 3 tầng **Controller → Service → Repository**, kèm `entity`, `dto`, `mapper`. Package chia **theo tầng ở gốc**, trong mỗi tầng chia package con **theo tính năng**:

```
com.hrmdemo/
├── config/  security/  exception/
├── controller/<tính năng>/   vd controller/employee/
├── service/<tính năng>/
├── repository/<tính năng>/
├── entity/<tính năng>/
├── dto/<tính năng>/          (DTO dùng chung đặt ngay ở dto/)
└── mapper/<tính năng>/
```

Tất cả bảng nằm trong **một schema chung** (`public`) của PostgreSQL.

Chúng tôi chọn cách này vì:
- Đây là kiến trúc Spring Boot quen thuộc nhất của đội, dùng thẳng các thư viện phổ biến (Spring Security, Data JPA…), nên nhanh ra demo trong 8 tuần.
- Demo và bản cài on-prem chỉ cần một thứ duy nhất để deploy. Các nghiệp vụ như khóa kỳ công rồi tính lương cần transaction đơn giản.

## Considered Options

- **Modular monolith với Spring Modulith, mỗi context một schema: bỏ** (04/10/2026). Ranh giới module và schema riêng làm chậm việc dựng khung và viết tính năng, trong khi demo chưa cần tách service.
- **Microservices: loại.** Quá nặng cho đội nhỏ và cài on-prem.

## Consequences

- **Quy tắc tầng** được `LayerRulesTest` (ArchUnit) kiểm:
  - controller không dùng repository hay entity, chỉ nhận và trả DTO;
  - chỉ service được dùng repository.
- **Giữa các tính năng:** service của tính năng này gọi service của tính năng khác, không gọi thẳng repository của nhau.
- **Logic nghiệp vụ lõi** (lương, chấm công, phép, phân bổ, luồng duyệt, phạm vi truy cập) nằm ở tầng service. Bắt buộc có unit test (JUnit + Mockito) và integration test với PostgreSQL qua Testcontainers.
- **Tên tính năng** lấy theo glossary. Các context trong `CONTEXT-MAP.md` là nhóm thuật ngữ, không phải ranh giới code.
- **Migration Flyway** đặt tên `V<yyyyMMddHHmm>__<mô_tả>.sql`.
