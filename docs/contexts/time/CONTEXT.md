# Time

Thời gian làm việc của Nhân viên: lịch làm việc, ca, chấm công, tăng ca và nghỉ phép. Đầu ra là bảng công đã khóa, làm đầu vào cho tính lương.

## Language

**Lịch làm việc**:
Cấu hình của **Pháp nhân** cho biết mỗi thứ trong tuần là ngày làm cả ngày, nửa ngày, hay ngày nghỉ. Có thể gán riêng theo **Nhân viên** hoặc theo ca.
_Avoid_: work schedule, lịch ca (lịch ca là phân ca cụ thể theo ngày)

**Ca làm việc**:
Mẫu giờ làm có tên của **Pháp nhân**: giờ bắt đầu và kết thúc, khung nghỉ giữa ca (không bắt buộc), mức cho phép đi muộn và về sớm (0–120 phút) và cách làm tròn giờ làm (không, lên, xuống, gần nhất; bước 5, 10, 15 hoặc 30 phút). Giờ kết thúc bằng hoặc trước giờ bắt đầu nghĩa là ca qua nửa đêm; ca đó thuộc ngày bắt đầu. Không bao giờ bị xóa, chỉ ngừng dùng. Số phút làm theo lịch là độ dài ca trừ khung nghỉ; số phút rơi vào 22:00–06:00 là **Giờ làm đêm** của ca.
_Avoid_: shift pattern, lịch ca (lịch ca là **Phân ca**)

**Phân ca**:
Một **Ca làm việc** gán cho một **Nhân viên** vào một ngày; mỗi Nhân viên có nhiều nhất một Phân ca mỗi ngày.
_Avoid_: shift schedule, xếp ca

**Ca mặc định**:
**Ca làm việc** của một **Đơn vị tổ chức**, áp dụng cho Nhân viên của đơn vị vào những ngày làm theo **Lịch làm việc** (không phải ngày lễ) khi chưa có **Phân ca** riêng. Đơn vị chưa đặt thì dùng Ca mặc định của đơn vị cha gần nhất.
_Avoid_: ca chuẩn, default shift

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
In code it is derived on every read, like the **Số dư phép**, with no year-end job: on 1 January the unused days of the year before (its accrual minus the days its own Phép tồn did not cover, never below 0) become Phép tồn, up to the maximum of the **Chính sách phép** of that day. Days (approved or waiting) dated on or before the expiry come off it first; what is left after the expiry is lost, and a lost Phép tồn is never carried again.
_Avoid_: phép chuyển tiếp, carry-over

**Loại nghỉ**:
A kind of leave with rules of its own: Phép năm, Nghỉ ốm, Thai sản, Việc riêng có lương, Không lương by default. Configured on a settings page (Hệ thống › Cấu hình nghỉ phép, permission `LEAVE_POLICY_EDIT`), not in a Danh mục, because each type carries a **Chính sách phép**. Never deleted; a type the company no longer offers is made inactive.
_Avoid_: leave category, loại phép (khi nói về cấu hình)

**Chính sách phép**:
The rules of one **Loại nghỉ**, kept as versions with an effective date: who pays (company, BHXH, nobody), whether half days and files are allowed or needed, whether the type is limited by a **Số dư phép**, the **Định mức phép năm** and its seniority step, monthly accrual or a yearly grant, the cut-off day for mid-month hires, **Ứng trước phép**, the most days per request, and the **Phép tồn** rules. Also the name of the deep module that computes balances and checks requests from these rules.
_Avoid_: leave policy (trong tài liệu tiếng Việt), quy định phép

**Đơn nghỉ**:
An Employee's request for leave of one **Loại nghỉ**, from a day (whole, or from the afternoon) to a day (whole, or until noon), sent as a Yêu cầu phê duyệt through the Luồng phê duyệt "Nghỉ phép". It counts working days of the **Lịch làm việc** without holidays; half a day is the smallest unit. Its days are stored as counted when it was sent. The sender may copy people (CC) and attach files, cancel it while it waits, and cancel it after approval until it starts. The PM of every **Dự án** the sender is allocated to during the leave (not closed, and not already told as approver or CC) hears of it when it is sent, and again when a returned request is moved to other days; the approver sees those projects on the request.
_Avoid_: leave request (trong tài liệu tiếng Việt), đơn xin phép

**Số dư phép**:
For one Employee, **Loại nghỉ** and year: Được cấp (accrued to date, and the whole year), Đã dùng (approved requests), Đang chờ (waiting or returned ones) and Còn lại (accrued minus used minus pending). Computed on every read from the policy and the requests, never stored, so approving or cancelling a request changes it at once. A type that is not limited has only used and pending.
_Avoid_: quỹ phép, leave balance (trong tài liệu tiếng Việt)

**Lịch nghỉ phép**:
Who is off on which days, by month or week, from the **Đơn nghỉ** that are approved or waiting (a returned one plans nothing). Each person's days are the days their request counts, so weekends, holidays and half days are exact. It shows what the caller's data scope covers and can be narrowed to an **Đơn vị tổ chức** (with the units below) or a **Dự án** (people allocated to it during their leave).
_Avoid_: leave calendar (trong tài liệu tiếng Việt), lịch vắng mặt

**Ứng trước phép**:
Taking **Phép năm** that has not accrued yet, up to the whole year's **Định mức phép năm**, when the **Chính sách phép** allows it. Còn lại then goes below zero.
_Avoid_: phép âm, mượn phép

## Example dialogue

> **Dev:** Tháng 2 có 20 ngày thường, 4 sáng thứ Bảy và một ngày lễ vào thứ Tư. **Công chuẩn** là bao nhiêu?
> **HR:** 22. Ngày lễ vẫn nằm trong công chuẩn, và cũng được cộng vào **Công thực tế**, vì nghỉ lễ được hưởng nguyên lương.
> **Dev:** Anh Tú đã nghỉ 5 ngày phép, nhưng đến tháng 4 mới tích lũy được 4 ngày thì xin nghỉ việc. Hệ thống xử lý sao?
> **HR:** Số dư **Phép năm** của anh ấy là −1. Hệ thống cảnh báo khi xử lý nghỉ việc, còn có trừ lương hay không thì HR quyết định.
