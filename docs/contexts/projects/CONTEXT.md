# Projects

Dự án và việc sử dụng nhân sự cho dự án: ai làm dự án nào, bao nhiêu phần trăm thời gian, và giờ làm thực tế.

## Language

**Dự án**:
Một khối công việc có thời hạn, có một **PM** và một ngân sách nhân sự, được giao cho các **Nhân viên** thông qua **Phân bổ**.
_Avoid_: project (trong tài liệu tiếng Việt), job

**PM**:
**Nhân viên** quản lý một **Dự án**. PM duyệt timesheet của dự án mình và nhận thông báo khi thành viên nghỉ phép. PM không duyệt nghỉ phép hay OT.
_Avoid_: quản lý (khi không rõ là Quản lý trực tiếp hay PM)

**Phân bổ**:
Cam kết theo kế hoạch rằng một **Nhân viên** dành một tỷ lệ phần trăm thời gian cho một **Dự án** trong một khoảng ngày, với một vai trò dự án.
_Avoid_: assignment, giao việc

**Tải phân bổ**:
Tổng % **Phân bổ** của một **Nhân viên** trong một kỳ. Không trừ ngày nghỉ. Vượt 100% là **Quá tải**.
_Avoid_: utilization, workload

**Thử phân bổ**:
Kiểm tra một **Phân bổ** mới hoặc đã sửa trước khi lưu: **Tải phân bổ** của **Nhân viên** đó theo từng khoảng ngày nếu lưu, các khoảng **Quá tải**, và gợi ý sửa (phần trăm cao nhất không gây quá tải, ngày bắt đầu sớm nhất sau chồng lấn). Không lưu gì.
_Avoid_: check, preview phân bổ

**Utilization**:
Tỷ lệ giữa số giờ timesheet đã duyệt và số giờ khả dụng (giờ chuẩn trừ nghỉ phép và ngày lễ) của một **Nhân viên** trong một kỳ. Đây là chỉ số thực tế, khác với **Tải phân bổ** là chỉ số kế hoạch.
_Avoid_: tỷ lệ phân bổ, tải

**Bench**:
Các **Nhân viên** có **Tải phân bổ** dưới ngưỡng cấu hình (mặc định 50%) trong kỳ đang xem.
_Avoid_: nhân sự rảnh, idle

**Sắp hết dự án**:
**Nhân viên** có ít nhất một **Phân bổ** kết thúc trong N tuần tới (mặc định 4).

**Ngưỡng nguồn lực**:
Ba giá trị công ty đặt cho Heatmap, **Bench** và **Sắp hết dự án**: ngưỡng Bench (mặc định 50%), mức gần đầy (mặc định 90%, từ mức này đến 100% ô heatmap tô đậm) và số tuần của Sắp hết dự án (mặc định 4). **Quá tải** luôn là trên 100%, không cấu hình. Admin và Giám đốc sửa; mọi người xem Nguồn lực thấy cùng một bộ ngưỡng.
_Avoid_: cấu hình heatmap, threshold

## Example dialogue

> **Dev:** Chị Lan xin nghỉ 2 ngày thì anh Minh (PM của P1) có duyệt không?
> **HR:** Không. Anh Hùng, **Quản lý trực tiếp** của chị Lan, mới là người duyệt. Anh Minh chỉ nhận thông báo để sắp xếp lại công việc của **Dự án**.
> **Dev:** Tuần đó chị Lan có **Tải phân bổ** 100% nhưng chỉ log được 28 giờ, nghỉ 1 ngày. Vậy **Utilization** bao nhiêu?
> **PM:** 28 / (40 − 8) = 87,5%. Tải phân bổ vẫn là 100%, vì đó là kế hoạch.
