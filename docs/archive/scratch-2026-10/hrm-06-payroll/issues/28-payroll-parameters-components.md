Status: ready-for-human
Type: HITL

# #28 Tham số lương/BHXH/thuế & thành phần lương

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 64, 65

## What to build

HR/Kế toán cấu hình tham số có ngày hiệu lực: lương cơ sở, lương tối thiểu vùng, tỷ lệ và trần đóng BHXH/BHYT/BHTN (phần NLĐ, phần DN), bậc thuế TNCN lũy tiến, mức giảm trừ bản thân/người phụ thuộc, hệ số OT theo loại ngày, phụ trội làm đêm, phụ trội đêm cho OT, trần OT tháng/năm. Cấu hình thành phần lương: phụ cấp (cờ đóng BH / chịu thuế / quy đổi theo ngày công), thưởng, khấu trừ, tạm ứng.

## Acceptance criteria

- [ ] Truy vấn tham số theo ngày trả đúng bản ghi có hiệu lực
- [ ] Không cho hai bản ghi cùng loại chồng lấn hiệu lực
- [ ] Seed tham số theo quy định hiện hành
- [ ] Tham số thuế khấu trừ 10% và ngưỡng áp dụng (2 triệu/lần)
- [ ] HITL: kế toán xác nhận tháng chuyển từ thử việc sang chính thức tính thuế **theo từng Đoạn hiệu lực** (mặc định) hay một cách cho cả tháng; nếu khách chọn cách thứ hai thì thêm một cờ cấu hình
- [ ] HITL: người đối chiếu toàn bộ giá trị thuế/BHXH/lương tối thiểu vùng với văn bản pháp luật hiện hành trước khi merge

## Design

- **Mức:** P (Pattern)
- **Màn hình:** Tham số lương, thành phần lương
- **Pattern:** P6, P2 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Code theo pattern, không cần mockup
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #05 Danh mục dùng chung — `.scratch/hrm-01-foundation/issues/05-catalogs.md`
