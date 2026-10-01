Status: ready-for-agent
Type: AFK

# #10 Hợp đồng lao động & xuất Word/PDF

## Parent

`.scratch/hrm-demo/PRD.md` — user stories: 27, 28

## What to build

Tab Hợp đồng: tạo/sửa/xóa HĐ (loại HĐ, ngày ký, ngày bắt đầu/kết thúc, lương, các phụ cấp). Lưu HĐ hoặc phụ lục HĐ sẽ tạo một bản ghi **Hồ sơ lương** có ngày hiệu lực (mức lương, Lương đóng BH, phụ cấp), có liên kết ngược về chứng từ nguồn. Tab "Lương & phụ cấp" hiển thị Hồ sơ lương theo dòng thời gian. Có API để hỏi Hồ sơ lương của nhân viên trong một khoảng ngày (đầu vào cho tính lương). Xuất HĐ ra Word và PDF từ template có trường trộn (merge fields).

## Acceptance criteria

- [ ] Không cho hai HĐ chồng lấn thời gian cho cùng một nhân viên
- [ ] Phụ lục HĐ tăng lương từ ngày 16 tạo bản ghi Hồ sơ lương mới; truy vấn khoảng 1–31 trả về 2 đoạn
- [ ] HĐ thử việc riêng tạo Hồ sơ lương mặc định 85% lương, không đóng BH, Cách tính thuế là khấu trừ 10%; HĐLĐ có điều khoản thử việc mặc định đóng BH và tính lũy tiến; HR sửa được cờ, và việc sửa có audit
- [ ] Hồ sơ lương không sửa trực tiếp được, chỉ thay đổi qua chứng từ, và có audit
- [ ] File Word/PDF xuất ra đúng dữ liệu, đúng định dạng tiếng Việt
- [ ] Template HĐ thay được mà không cần sửa code

## Design

- **Mức:** H (Hero, vẽ mockup trước khi code)
- **Màn hình:** Tab Hợp đồng + dòng thời gian Hồ sơ lương + xem trước file xuất
- **Pattern:** P3, P6, P8 (xem `docs/design/DESIGN_PLAN.md` mục 3)
- **Nguồn:** Artboard "#10 …" trên Canvas chính (https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk)
- **Token:** artifact HRM (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp)
- [ ] Đã review bằng `web-design-guidelines` và `design:accessibility-review` trước khi merge

## Blocked by

- #06 Danh sách nhân viên & hồ sơ cơ bản — `.scratch/hrm-02-people/issues/06-employee-list-profile.md`
