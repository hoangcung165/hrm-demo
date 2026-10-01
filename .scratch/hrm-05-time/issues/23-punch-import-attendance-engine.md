Status: ready-for-agent
Type: AFK

# #23 Import log quẹt thẻ & Bộ xử lý chấm công

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 55, 56, 57

## What to build

HR import file log (CSV/Excel) từ máy chấm công; hệ thống kiểm tra mã NV, quẹt trùng và báo lỗi theo dòng. Xây module thuần **Bộ xử lý chấm công**: ghép Vào/Ra theo lần quẹt đầu/cuối trong ca (ca đêm gán về ngày bắt đầu ca), tính phút làm, đi trễ, về sớm, thiếu quẹt, vắng. Màn hình công theo ngày có đánh dấu bất thường.

## Acceptance criteria

- [ ] Import lại cùng file không tạo trùng
- [ ] Ca đêm 22:00–06:00 được ghép đúng về ngày bắt đầu
- [ ] Unit test module: đúng giờ, trễ, về sớm, thiếu quẹt vào/ra, quẹt trùng, ca đêm, ngày lễ

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Wizard import log, công theo ngày có đánh dấu bất thường
- **Pattern:** P5, P2 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#23 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #22 Ca làm việc & phân ca — `.scratch/hrm-05-time/issues/22-shifts-scheduling.md`
