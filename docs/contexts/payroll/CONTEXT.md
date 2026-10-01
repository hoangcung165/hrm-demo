# Payroll

Tính lương, bảo hiểm bắt buộc và thuế TNCN cho các Nhân viên của Pháp nhân theo từng kỳ; duyệt, khóa và chi trả.

## Language

**Kỳ lương**:
Khoảng thời gian (mặc định một tháng dương lịch) mà lương được tính, duyệt và khóa cùng nhau. Chỉ tính được khi kỳ công tương ứng đã khóa.
_Avoid_: payroll run, tháng lương

**Đoạn hiệu lực**:
Một khoảng liên tục trong **Kỳ lương** mà lương và phụ cấp của một **Nhân viên** không đổi. Mỗi lần thay đổi giữa kỳ là bắt đầu một Đoạn mới, và lương mỗi Đoạn được tính theo **Công thực tế** nằm trong Đoạn đó.
_Avoid_: segment, giai đoạn

**Lương đóng BH**:
Mức lương làm căn cứ đóng BHXH/BHYT/BHTN, lấy theo mức có hiệu lực vào cuối **Kỳ lương**.
_Avoid_: lương cơ bản (khi nói về căn cứ đóng BH)

**Cách tính thuế**:
Cách khấu trừ thuế TNCN áp dụng cho một **Đoạn hiệu lực**: lũy tiến (có giảm trừ gia cảnh), hoặc khấu trừ 10% (cho HĐ thử việc riêng hoặc HĐ dưới 3 tháng, trừ khi có cam kết).
_Avoid_: tax mode, loại thuế

## Example dialogue

> **Dev:** Anh Nam được tăng lương từ ngày 16/3. Tháng 3 tính thế nào?
> **Kế toán:** Chia làm 2 **Đoạn hiệu lực**: ngày 1–15 tính theo mức cũ, ngày 16–31 tính theo mức mới, cả hai đều chia cho **Công chuẩn** 22. Thuế thì tính trên tổng thu nhập của cả **Kỳ lương**. BH tính trên **Lương đóng BH** có hiệu lực vào cuối kỳ, tức mức mới.
