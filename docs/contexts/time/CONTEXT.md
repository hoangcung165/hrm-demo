# Time

Thời gian làm việc của Nhân viên: lịch làm việc, ca, chấm công, tăng ca và nghỉ phép. Đầu ra là bảng công đã khóa, làm đầu vào cho tính lương.

## Language

**Lịch làm việc**:
Cấu hình của **Pháp nhân** cho biết mỗi thứ trong tuần là ngày làm cả ngày, nửa ngày, hay ngày nghỉ. Có thể gán riêng theo **Nhân viên** hoặc theo ca.
_Avoid_: work schedule, lịch ca (lịch ca là phân ca cụ thể theo ngày)

**Công**:
Đơn vị đo thời gian làm việc theo ngày. Một ngày làm đủ là 1 công, nửa ngày là 0,5 công. Giờ OT không tính vào công.
_Avoid_: ngày công (khi muốn nói số lẻ), man-day

**Công chuẩn**:
Số **Công** mà một **Nhân viên** phải làm trong kỳ, dùng làm mẫu số khi tính lương. Mặc định bằng tổng công theo **Lịch làm việc** của tháng, có tính cả ngày lễ. Có thể cấu hình thành một số cố định (ví dụ 26).
_Avoid_: công tiêu chuẩn, standard days

**Công thực tế**:
Số **Công** được hưởng lương trong kỳ: công đi làm, cộng công nghỉ phép có hưởng lương, cộng công ngày lễ. Nghỉ không lương không được tính.
_Avoid_: công làm việc, worked days

**Giờ làm đêm**:
Giờ làm việc theo lịch rơi vào khung đêm (mặc định 22:00–06:00). Không phải OT, nhưng được trả thêm phụ trội đêm.
_Avoid_: OT đêm (khi nói về ca đêm theo lịch), night shift hours

**Giờ OT**:
Giờ làm ngoài lịch, có đơn OT đã duyệt, và được xác nhận bằng giờ quẹt thẻ thực tế. Được phân loại theo ngày chứa giờ đó (ngày thường, ngày nghỉ hằng tuần, ngày lễ), và theo việc có rơi vào khung đêm hay không.
_Avoid_: tăng ca (khi chưa được duyệt), overtime

**Định mức phép năm**:
Số ngày **Phép năm** một **Nhân viên** được hưởng trong một năm đủ: 12 ngày theo mặc định, cộng 1 ngày cho mỗi 5 năm thâm niên.
_Avoid_: quota, số phép

**Phép năm**:
Loại nghỉ có hưởng lương, được cộng dồn mỗi tháng làm việc bằng 1/12 **Định mức phép năm**. Được ứng trước đến tối đa định mức cả năm, nên số dư có thể âm.
_Avoid_: annual leave (trong tài liệu tiếng Việt), phép (khi nói chung mọi loại nghỉ)

**Phép tồn**:
Phần **Phép năm** chưa dùng của năm trước, được chuyển sang năm mới với một hạn dùng. Khi nghỉ, phép tồn được trừ trước, và phần còn lại tự mất khi hết hạn.
_Avoid_: phép chuyển tiếp, carry-over

## Example dialogue

> **Dev:** Tháng 2 có 20 ngày thường, 4 sáng thứ Bảy và một ngày lễ vào thứ Tư. **Công chuẩn** là bao nhiêu?
> **HR:** 22. Ngày lễ vẫn nằm trong công chuẩn, và cũng được cộng vào **Công thực tế**, vì nghỉ lễ được hưởng nguyên lương.
> **Dev:** Anh Tú đã nghỉ 5 ngày phép, nhưng đến tháng 4 mới tích lũy được 4 ngày thì xin nghỉ việc. Hệ thống xử lý sao?
> **HR:** Số dư **Phép năm** của anh ấy là −1. Hệ thống cảnh báo khi xử lý nghỉ việc, còn có trừ lương hay không thì HR quyết định.
