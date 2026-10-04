---
name: hrm-status
description: Báo cáo trạng thái dự án HRM Demo từ GitHub Issues (tiến độ theo milestone, việc sẵn sàng, việc bị chặn, ai đang làm gì, PR chờ review) và mở khóa các issue đã hết bị chặn. Dùng khi người dùng hỏi "dự án đang thế nào", "status", "tiến độ", "còn việc gì", hoặc gõ /hrm-status.
---

# HRM status

Repo: `hoangcung165/hrm-demo`. Dùng GitHub MCP nếu có, nếu không thì dùng `gh`. Quy ước nhãn và trạng thái: `docs/agents/workflow.md`.

## 1. Thu thập dữ liệu

- Toàn bộ issue (mở và đóng), trừ issue có nhãn `prd`: số, tiêu đề (`[HRM-xx] …`), trạng thái, nhãn, ngày cập nhật, mục "Blocked by" trong body (các `#<số>`).
- Các PR đang mở: số, tiêu đề, tác giả, ngày tạo, trạng thái review.
- Với issue `status:in-progress`: comment "Đang làm: …" gần nhất để biết agent và thời điểm bắt đầu.

Phân trang mỗi lần 50 issue. Chỉ đọc những trường cần.

**Slices:** issue có tiêu đề `[HRM-xx/BE-n]`, `[HRM-xx/FE-n]`… là một phần của issue cha `[HRM-xx]` (xem `docs/agents/workflow.md`, mục "Slices"). Tính tiến độ theo mốc và lộ trình bằng **issue cha**; với issue cha đang làm, ghi thêm "x/y phần đã xong" và phần đang làm. Issue cha đang mở mà mọi slice đã đóng thì báo ở mục "Cần quyết định" là cần đóng.

## 2. Mở khóa (việc duy nhất skill được phép sửa)

Với mỗi issue mở có `status:blocked`: nếu **mọi** issue trong mục "Blocked by" đã đóng, thì bỏ `status:blocked` và thêm `status:ready`. Ghi lại các issue vừa được mở khóa để báo cáo.

Không sửa gì khác. Không nhận việc, không đóng issue.

## 3. Báo cáo

Trả lời bằng tiếng Việt, ngắn gọn, theo đúng thứ tự sau:

1. **Tổng quan theo mốc:** với mỗi `milestone:demo-v1`, `milestone:demo-v2`, `milestone:p1`, ghi số đã xong / tổng (%), số đang làm, số chờ review.
2. **So với lộ trình:** tuần hiện tại tính từ ngày tạo issue PRD (tuần 1 bắt đầu ngày đó). Lộ trình:
   - tuần 1: HRM-01 đến 05
   - tuần 2: HRM-06 đến 14
   - tuần 3: HRM-15 đến 17
   - tuần 4: HRM-18 đến 21 (Demo v1)
   - tuần 5: HRM-22 đến 27
   - tuần 6–7: HRM-28 đến 31
   - tuần 8: HRM-32 đến 34 (Demo v2)

   Liệt kê các issue lẽ ra phải xong đến hết tuần hiện tại nhưng chưa đóng, đánh dấu **trễ**.
3. **Đang làm:** mỗi dòng gồm mã, tên, agent, số ngày từ lúc nhận. Cảnh báo nếu quá 2 ngày.
4. **Chờ review:** các PR đang mở, mỗi dòng gồm số PR, mã issue, tác giả, số ngày chờ. Ghi chú "cần người duyệt" nếu issue có `type:hitl` hoặc `area:payroll`.
5. **Sẵn sàng nhận:** issue `status:ready`, chia làm 2 nhóm: cho agent và cho người.
6. **Vừa mở khóa:** các issue được mở khóa ở bước 2.
7. **Đang bị chặn:** chỉ liệt kê các issue chặn **nhiều** việc nhất, mỗi dòng ghi "HRM-xx chặn N việc".
8. **Cần quyết định:** các issue có `needs-info`, kèm câu hỏi đang chờ trả lời.

Kết thúc bằng một dòng gợi ý việc nên làm tiếp theo.
