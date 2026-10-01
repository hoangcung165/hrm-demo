# HRM Demo — Danh sách tính năng & Lộ trình

## 1. Chiến lược thắng thầu
Khách không mua "danh sách tính năng", khách mua **niềm tin rằng hệ thống chạy đúng nghiệp vụ của họ**. Vì vậy demo cần:

1. **Luồng end-to-end chạy thật, không chỉ mockup.**
   - Luồng nhân sự: Hồ sơ → Chấm công/Nghỉ phép → Tính lương → Duyệt → Phiếu lương → File ngân hàng.
   - Luồng dự án: Dự án → Phân bổ nhân sự → Timesheet → Hiệu suất sử dụng nhân sự và chi phí dự án.
2. **Nói đúng ngôn ngữ nghiệp vụ Việt Nam.** Gồm BHXH/BHYT/BHTN, thuế TNCN lũy tiến, giảm trừ gia cảnh, người phụ thuộc, HĐLĐ. Bảng thuế và mức đóng phải **cấu hình được**, và cần kiểm lại theo quy định hiện hành trước khi demo.
3. **Cấu hình được, không hard-code.** Loại phép, phụ cấp, ca làm việc, cấp duyệt (tối đa 3 cấp), công thức lương, vai trò trong dự án đều phải chỉnh được. Đây là câu trả lời cho mọi câu "công ty tôi có quy định riêng…".
4. **Chuẩn bị gói điểm nhấn và đổi theo loại khách:**
   - *Doanh nghiệp dịch vụ/dự án:* quản lý dự án, phân bổ nguồn lực, timesheet, chi phí nhân sự theo dự án.
   - *Doanh nghiệp sản xuất:* phân xưởng/tổ, ca kíp, import log máy chấm công, lương sản phẩm.
5. **Cá nhân hóa trước mỗi buổi demo.** Đổi logo, tên phòng ban, cột bảng lương theo biểu mẫu khách gửi. Seed dữ liệu đúng quy mô của khách (150–700 nhân viên) để khách thấy hệ thống chạy mượt.
6. **Cho khách tự dùng thử.** Deploy lên URL riêng, có nút chuyển vai trò 1 click (HR / Quản lý dự án / Nhân viên / Kế toán / Giám đốc).

## 2. Tính năng làm trong DEMO (8 tuần)
Chia 2 mức ưu tiên:
- **P0**: bắt buộc có.
- **P1**: làm nếu kịp; chọn theo loại khách.

### 2.1 Nền tảng & Quản trị (P0)
| Tính năng | Ghi chú demo |
|---|---|
| Đăng nhập, đổi mật khẩu | Có thêm nút "Demo as…" để chuyển vai trò nhanh |
| Phân quyền theo vai trò (RBAC) | Các vai trò: Admin, HR, Quản lý trực tiếp/Tổ trưởng, **Quản lý dự án (PM)**, Kế toán, Giám đốc, Nhân viên. Phạm vi xem dữ liệu giới hạn theo phòng ban/dự án |
| Thông tin công ty | Demo cho **một công ty**: tên, mã số thuế, địa chỉ, logo. Dùng in lên HĐ, phiếu lương, báo cáo |
| Cơ cấu tổ chức nhiều cấp | Công ty → Phòng ban → Nhóm/Tổ. Có sơ đồ tổ chức (org chart) |
| Danh mục dùng chung | Chức danh, loại HĐ, loại phụ cấp, loại phép, ca làm việc, ngày lễ, kỹ năng, vai trò dự án |
| Cấu hình luồng duyệt | Tối đa 3 cấp. Có tự duyệt sau N ngày |
| Thông báo trong app + email | Email có thể chạy qua SMTP test |
| Nhật ký thao tác (audit log) | Ai sửa lương/công/phân bổ, lúc nào |
| Song ngữ Việt/Anh | Làm i18n từ đầu nên chi phí thấp |

### 2.2 Hồ sơ nhân viên (P0)
| Tính năng | Ghi chú demo |
|---|---|
| Danh sách nhân viên | Tìm kiếm, lọc, import/export Excel |
| Hồ sơ nhiều tab | Cá nhân, Công việc, Hợp đồng, Lương & phụ cấp, BHXH, Ngân hàng, Người phụ thuộc, **Kỹ năng**, **Dự án**, Tài liệu đính kèm |
| Kỹ năng & trình độ | Danh sách kỹ năng, mức độ (1–5), chứng chỉ kèm ngày hết hạn. Là dữ liệu đầu vào để tìm người cho dự án |
| Quá trình công tác | Điều chuyển, bổ nhiệm, khen thưởng, kỷ luật. Có timeline trực quan |
| Hợp đồng lao động | Thêm/sửa/xóa, loại HĐ, **xuất HĐ ra Word/PDF theo mẫu** |
| Thử việc | Ngày bắt đầu/kết thúc, kết quả Đạt/Không đạt/Gia hạn |
| **Cảnh báo sắp hết hạn** | HĐ, thử việc, visa/giấy phép lao động, chứng chỉ. Hiện trên widget dashboard và gửi email |
| Nghỉ việc | Ghi nhận ngày nghỉ, lý do; chuyển nhân viên sang trạng thái Inactive (không xóa) |

### 2.3 Quản lý dự án & Nhân sự dự án (P0, điểm nhấn mới)
| Tính năng | Ghi chú demo |
|---|---|
| Danh mục dự án | Mã, tên, khách hàng/đối tác, PM, phòng ban phụ trách, ngày bắt đầu/kết thúc, trạng thái (Đề xuất / Đang chạy / Tạm dừng / Kết thúc), ngân sách nhân sự |
| **Phân bổ nhân sự vào dự án** | Thêm thành viên, vai trò trong dự án (PM, BA, Dev, QA…), % phân bổ, thời gian tham gia. Một người có thể ở nhiều dự án |
| **Cảnh báo quá tải** | Tổng phân bổ của một người vượt 100% trong cùng kỳ thì hiện cảnh báo đỏ |
| **Bản đồ nguồn lực (Resource heatmap)** | Ma trận nhân viên × tuần/tháng, tô màu theo % phân bổ. Thấy ngay ai đang rảnh (bench) và ai sắp hết dự án |
| Tìm người theo kỹ năng | Lọc theo kỹ năng, mức độ và thời gian còn trống, rồi gán vào dự án ngay trên kết quả tìm kiếm |
| Timesheet theo dự án | Nhân viên log giờ theo ngày/tuần cho từng dự án. PM duyệt hoặc từ chối |
| Tab "Dự án" trong hồ sơ | Lịch sử dự án đã tham gia, vai trò, thời gian |
| Dashboard dự án | Số dự án đang chạy, headcount theo dự án, **tỷ lệ sử dụng nhân sự (utilization rate)**, danh sách bench |

### 2.4 Nghỉ phép (P0)
| Tính năng | Ghi chú demo |
|---|---|
| Chính sách phép | Phép năm theo thâm niên, phép ốm, thai sản, không lương. Quy tắc chuyển phép tồn sang năm sau |
| Đăng ký nghỉ | Cả ngày hoặc **nửa ngày**. Đính kèm file. Chọn người duyệt và người nhận CC |
| Duyệt / từ chối | Theo luồng đã cấu hình. **PM của các dự án người đó đang tham gia cũng nhận thông báo** |
| Số dư phép | Tự trừ khi đơn được duyệt |
| Lịch nghỉ trực quan | Xem theo tháng/tuần, lọc theo phòng ban hoặc dự án |

### 2.5 Chấm công & Ca làm việc (P0)
| Tính năng | Ghi chú demo |
|---|---|
| Thiết lập ca | Ca hành chính, ca xoay, ca đêm (qua ngày), giờ nghỉ, dung sai đi trễ |
| Phân ca | Theo cá nhân hoặc theo nhóm, xem dạng lịch |
| Import log máy chấm công | File CSV/Excel. Ghép cặp Vào/Ra. Báo lỗi nếu thiếu hoặc trùng |
| Chấm công thủ công | Dành cho bộ phận chưa có máy chấm công |
| Bảng công tháng | Công chuẩn, đi trễ/về sớm, thiếu công, nghỉ phép (lấy tự động từ module Nghỉ phép) |
| Đơn bổ sung công, đăng ký tăng ca (OT) | Có luồng duyệt. OT hỗ trợ duyệt trước hoặc xác nhận sau |
| Duyệt & khóa bảng công | Khóa kỳ công trước khi tính lương |

### 2.6 Tính lương, BHXH, Thuế TNCN (P0)
| Tính năng | Ghi chú demo |
|---|---|
| Kỳ lương & tham số | Lương cơ sở, lương tối thiểu vùng, tỷ lệ đóng BHXH, bảng thuế. Tất cả là cấu hình, có ngày hiệu lực |
| Thành phần lương | Lương cơ bản, phụ cấp (có cờ đóng BH / chịu thuế / quy đổi theo ngày công), thưởng, khấu trừ, tạm ứng |
| Tính lương theo công + OT | Tiền OT theo hệ số ngày thường/cuối tuần/lễ |
| BHXH/BHYT/BHTN | Tính phần người lao động và phần doanh nghiệp |
| Thuế TNCN | Thuế lũy tiến, giảm trừ gia cảnh, người phụ thuộc |
| Quy trình 3 bước | **Setup → Preview (cảnh báo bất thường) → Confirm** |
| Duyệt nhiều cấp | Ví dụ: HR → Kế toán trưởng → Giám đốc. Duyệt xong thì khóa kỳ lương |
| Phiếu lương | Xem trên web, xuất PDF |
| File chi lương ngân hàng | Excel theo mẫu của 1 ngân hàng |

### 2.7 Cổng nhân viên (Self-service) (P0)
Nhân viên tự làm các việc sau:
- Xem và cập nhật hồ sơ, kỹ năng (sửa xong cần HR duyệt).
- Xem các dự án mình đang tham gia và log timesheet.
- Xem bảng công.
- Gửi đơn nghỉ phép/OT.
- Xem phiếu lương.

Giao diện **responsive trên điện thoại**.

### 2.8 Dashboard & Báo cáo (P0)
- **Dashboard:** headcount, số người đang làm/vắng hôm nay, đơn chờ duyệt (duyệt nhanh ngay trên dashboard), HĐ sắp hết hạn, quỹ lương theo tháng, utilization rate, bench.
- **6 báo cáo xuất Excel:**
  1. Danh sách nhân sự
  2. Biến động nhân sự
  3. Nghỉ phép
  4. Tổng hợp chấm công
  5. Tổng hợp lương
  6. **Phân bổ & utilization theo dự án**

### 2.9 Gói điểm nhấn (P1, chọn theo loại khách)
| Gói | Tính năng |
|---|---|
| Dự án | **Chi phí nhân sự theo dự án**: lương × % phân bổ, hoặc lương × giờ timesheet. So sánh với ngân sách nhân sự dự án (kế hoạch và thực tế). **Yêu cầu nhân sự cho dự án**: PM gửi yêu cầu (vai trò, kỹ năng, thời gian) → HR/Quản lý nguồn lực duyệt → gán người từ bench hoặc chuyển sang tuyển dụng |
| Hoa hồng | Commission tách riêng khỏi lương nhưng tính thuế trên tổng thu nhập |
| Sản xuất | Nhập sản lượng theo ngày/ca/tổ/mã hàng, đơn giá có ngày hiệu lực, rồi đưa vào lương sản phẩm |
| Chung | Tuyển dụng cơ bản: yêu cầu tuyển dụng → pipeline ứng viên dạng Kanban → chuyển ứng viên thành nhân viên |

## 3. Tính năng PLANNING (chờ khách chốt)
Chỉ đưa vào proposal và roadmap, **không build trong demo**. Các mục đánh dấu ★ nên có mockup tĩnh hoặc slide để khách thấy tầm nhìn sản phẩm.

| Nhóm | Tính năng |
|---|---|
| Dự án nâng cao ★ | Kế hoạch dự án (milestone, Gantt), dự báo nhu cầu nguồn lực, lãi/lỗ (P&L) nhân sự theo dự án, xuất dữ liệu phục vụ billing, tích hợp Jira/MS Project/Azure DevOps |
| Đánh giá / KPI ★ | Mẫu đánh giá động, nhân viên tự đánh giá → quản lý → Giám đốc → HR, **PM đánh giá thành viên sau mỗi dự án**, gắn kết quả KPI với thưởng |
| Tuyển dụng đầy đủ ★ | Đặt lịch phỏng vấn, đánh giá ứng viên, thư mời nhận việc, biểu mẫu tuyển dụng, tích hợp website/job board (API, CSV, webhook) |
| Đa công ty / tập đoàn | Nhiều pháp nhân trên một hệ thống, chuyển công ty trên giao diện, nhân viên thuộc nhiều công ty, báo cáo hợp nhất. Kiến trúc đã giữ sẵn đường mở rộng |
| Công tác | Đăng ký công tác, phân bổ chi phí theo dự án, quản lý vé/khách sạn, hạn mức theo cấp bậc |
| Talent Management | Talent Card, nguyện vọng nghề nghiệp, nhóm nhân sự tiềm năng (Top Talent), kế hoạch kế thừa |
| Portal nội bộ | Đăng tin, luồng duyệt bài, email theo mức độ quan trọng |
| Onboarding/Offboarding | Checklist, bàn giao tài sản, thu hồi quyền truy cập dự án, khóa tài khoản |
| Đào tạo & Chứng chỉ | Kế hoạch đào tạo, đào tạo bắt buộc, nhắc tái đào tạo, lộ trình kỹ năng |
| Sức khỏe & Bảo hộ lao động | Khám sức khỏe định kỳ, sổ sức khỏe, cấp phát bảo hộ lao động |
| Tài sản nhân viên | Cấp phát và thu hồi laptop/thiết bị, theo dõi theo người |
| HĐLĐ điện tử | Tích hợp chữ ký số, ký trên thiết bị |
| Tích hợp | SSO (Microsoft Entra ID/Google), API BHXH/eTax, kết nối trực tiếp máy chấm công (SDK), phần mềm kế toán, nhiều ngân hàng |
| Nghiệp vụ lương nâng cao | Quyết toán thuế TNCN năm, xuất đủ các mẫu tờ khai BHXH, trả phép tồn thành tiền, truy thu/truy lĩnh, quy trình khiếu nại lương |
| Mobile app native | iOS/Android |
| Dữ liệu & tuân thủ | Chuyển dữ liệu lịch sử, audit log lưu dài hạn, tuân thủ Nghị định 13/2023 (mã hóa trường nhạy cảm), luồng duyệt hơn 3 cấp, đa tiền tệ |
| Hạ tầng | Triển khai tại chỗ (on-prem) hoặc cloud, backup, giám sát |
| Analytics | Dashboard cho Ban Giám đốc: chi phí nhân sự, OT, tỷ lệ nghỉ việc, utilization theo thời gian |

## 4. Kịch bản demo (20–25 phút)
1. **HR đăng nhập → Dashboard:** ai vắng hôm nay, đơn chờ duyệt, HĐ sắp hết hạn, utilization rate.
2. **Tạo nhân viên mới** → khai báo kỹ năng → tạo HĐ → **xuất file Word HĐ**.
3. **PM tạo dự án mới** → tìm người theo kỹ năng → phân bổ 50% → hệ thống **cảnh báo quá tải** vì người đó đã 80% ở dự án khác → PM chọn người khác từ bench.
4. **Mở Resource heatmap** để thấy toàn cảnh nguồn lực công ty.
5. **Nhân viên (xem trên điện thoại):** log timesheet dự án, xin nghỉ nửa ngày → Quản lý và PM nhận thông báo → duyệt.
6. **Import file log chấm công** → bảng công hiện đi trễ, OT → khóa bảng công.
7. **Chạy lương:** Setup → Preview (hệ thống cảnh báo bất thường) → duyệt nhiều cấp → khóa kỳ lương → phiếu lương → file ngân hàng.
8. **(P1)** **Chi phí nhân sự dự án**: kế hoạch và thực tế.
9. **Xuất báo cáo Excel**, mở audit log.
10. **Chốt buổi demo:** roadmap các tính năng Planning, trình bày dạng slide.

## 5. Lộ trình 8 tuần
| Tuần | Hạng mục | Mốc |
|---|---|---|
| 1 | Khung dự án, auth/RBAC, thông tin công ty, cơ cấu tổ chức, danh mục, i18n, seed data | |
| 2 | Hồ sơ nhân viên, kỹ năng, hợp đồng (xuất mẫu), cảnh báo hết hạn | |
| 3 | **Dự án & phân bổ nhân sự**, cảnh báo quá tải, resource heatmap, tìm người theo kỹ năng | |
| 4 | Nghỉ phép + luồng duyệt + thông báo, cổng nhân viên, Dashboard v1 | **Demo v1**: hồ sơ, dự án, nghỉ phép |
| 5 | Timesheet dự án, ca làm việc, import log, bảng công, OT | |
| 6–7 | Tính lương, BHXH, thuế TNCN, duyệt, phiếu lương, file ngân hàng | |
| 8 | Báo cáo, audit log, gói P1 (chi phí dự án), polish UI, deploy, tập dượt kịch bản | **Demo v2**: bản đầy đủ |

## 6. Công nghệ (chưa chốt)
Tech stack **chưa được chọn**. Quyết định sẽ được đưa ra trong issue `#00 Chọn tech stack` và ghi lại thành ADR trước khi bắt đầu code.

Stack được chọn phải đáp ứng các yêu cầu sau:
- **Web app responsive:** màn hình self-service dùng tốt trên điện thoại.
- **Song ngữ Việt/Anh.**
- **Biểu đồ và heatmap:** hiển thị mượt với khoảng 700 nhân viên.
- **API có xác thực và phân quyền theo vai trò.**
- **Cơ sở dữ liệu quan hệ.**
- **Job chạy nền:** tự duyệt đơn, cảnh báo hết hạn, chuyển phép tồn.
- **Gửi email.**
- **Xuất file:** Excel, Word (HĐ theo mẫu), PDF (phiếu lương).
- **Kiểm thử:** có unit test cho các module lõi, và integration test chạy với database thật.
- **Đóng gói và deploy:** chạy toàn bộ bằng một lệnh, deploy được lên một URL demo.
- **Có đường nâng lên bản production** khi khách chốt, gồm cả trường hợp khách yêu cầu triển khai tại chỗ (on-prem).

Nguyên tắc thiết kế không phụ thuộc vào stack được chọn:
- **Thiết kế dữ liệu:**
  - Demo chỉ cho một công ty, nhưng các bảng gốc vẫn gắn `legal_entity_id` và việc lọc làm ở một chỗ tập trung, để sau này mở rộng thành đa công ty mà không phải viết lại.
  - Tham số lương, thuế, BHXH lưu dạng bảng cấu hình có ngày hiệu lực.
  - Phân bổ dự án lưu theo khoảng thời gian (`EmployeeId`, `ProjectId`, `Role`, `Percent`, `From`, `To`).

## 7. Rủi ro & lưu ý
- **Công thức lương là rủi ro lớn nhất.** Cần xin sớm bảng lương mẫu thật của khách.
- **Bảng thuế TNCN và mức giảm trừ gia cảnh** phải kiểm lại theo quy định hiện hành trước khi demo.
- **Không hứa trong demo** những thứ thuộc nhóm Planning. Trả lời theo hướng "có trong roadmap, phase 2".
- **Dữ liệu seed phải nhìn thật:** tên Việt, phòng ban, dự án và mức lương hợp lý. Heatmap cần có đủ các trạng thái rảnh / vừa / quá tải để demo nhìn thuyết phục.
