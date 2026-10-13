# HRM Demo — Design Plan

Kế hoạch design cho các issue trong `.scratch/` (xem `.scratch/hrm-demo/INDEX.md`). Cách làm đi theo thứ tự: **design system → các mẫu giao diện dùng chung (pattern) → vẽ mockup các màn hình "hero" trên canvas → các màn hình còn lại code thẳng theo pattern**. Phần design luôn đi trước phần dev khoảng 1 tuần.

## 0. Nguồn design trên Claude Design

**Design tool: Claude Design only (no Figma).** The component library (preview + guidelines per component, `components/bundle.css`) lives in the HRM design system artifact below. Library additions per issue: #02 Card, Textarea, Image upload, Company mark; #03 Tree, Org chart, Person and vacant Avatar, searchable Select with person options, detail list in Card, wide Dialog, destructive Menu item; #04 Menu person items (current mark, unavailable state, caption heading, keyboard focus ring), Table matrix (`hrm-table matrix` in `hrm-table-scroll`: read-only, and editable with checkbox cells, locked cells and a changed-cell mark), compact rows for list pages on a phone (`hrm-rows`) and Save bar (`hrm-savebar`: unsaved changes of a page edited in place). Design ↔ FE contract: `docs/agents/team.md`. Visual check: `docs/design/check-previews.md`. Token mirror for code: `docs/design/tokens.json`.

| Artifact | Vai trò |
|---|---|
| **HRM** (Design System): https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp | **Nguồn chuẩn duy nhất (canonical)** cho logo, màu, chữ, khoảng cách, bo góc, bóng đổ và giọng văn. Mọi token trong code phải lấy từ `project/tokens.json` của artifact này |
| HRM Design System (bản cũ): https://claude.ai/artifact/2W76bX9d1ewDq1zxE9FeKF | **Đã bị thay thế.** Không dùng màu xanh lá và font Be Vietnam Pro của bản này. Chỉ giữ lại các quy tắc giao diện sản phẩm (mục 1.3) |
| Canvas **HRM design**: https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk | **Main canvas** (renamed from "Giao diện HRM – bản mượt mà" on 04/10/2026). Artboards: Tổng quan, Danh sách nhân viên (1440 × 1100); `#01 App shell` (1440 × 900), `#01 App shell (mobile, menu mở)` (390 × 844), `#01 Đăng nhập` (1440 × 900), `#01 Quên / Đổi mật khẩu` (1440 × 1060); `#03 Cơ cấu tổ chức (cây)` (1440 × 1144), `#03 Sơ đồ tổ chức (org chart)` (1440 × 1270), `#03 Cơ cấu tổ chức (hộp thoại)` (1440 × 1570), `#03 Cơ cấu tổ chức (trạng thái)` (1440 × 1420); `#04 Tài khoản và vai trò (danh sách)` (1440 × 1810), `#04 Tài khoản (hộp thoại)` (1440 × 2400), `#04 Vai trò và quyền (ma trận)` (1440 × 3370), `#04 Demo as…` (1440 × 1230), `#04 Tài khoản và vai trò (trạng thái)` (1440 × 1840), `#04 Tài khoản (390, danh sách)` (390 × 1010), `#04 Vai trò và quyền (390)` (884 × 1570, two 390 frames), `#04 Demo as… (390, menu mở)` (390 × 844); then one row per issue for `#05`, `#06` and `#12`, with the artboards listed on each issue's row below; `#15 Danh sách dự án` (1440 × 860), `#15 Chi tiết dự án` (1440 × 1180), `#15 Phân bổ nhân sự (hộp thoại)` (1440 × 1540), `#15 Dự án (hộp thoại)` (1440 × 1460), `#15 Dự án (trạng thái)` (1440 × 1660), `#15 Danh sách dự án (390)` (390 × 844), the `#05`, `#06`, `#12` and `#15` rows copied unchanged on 13/10/2026 from the HTML exports of the approved temporary canvases, `#12` and `#15` with their prototype links kept, and linking the library copy uploaded that day (`hrm-library-2026-10-10.css`). The owner approved all eight `#04` artboards on 05/10/2026: six as first drawn, and the two `Vai trò và quyền` artboards as redrawn the same day with an editable matrix. Decided at that approval and not yet redrawn: every role saves together in one request, so the "partial save failure" panel on `#04 Vai trò và quyền (ma trận)` is superseded by a plain "not saved" Save bar that keeps every change. The `#01` and `#03` artboards wait for human approval; `#01 App shell` replaces the shell drawn in the two older artboards (which also still show the pre-system mock company of 248 employees; the `#03` artboards use the seed company of 186). Artboards from `#03` on link the library stylesheet uploaded to the canvas (tokens + `components/bundle.css`); upload a new copy when the library changes (the `#04` artboards link the copies uploaded on 05/10/2026, the two `Vai trò và quyền` artboards the later one; older artboards keep the copy they were drawn with and render the same with the newest one). New screens are drawn here |
| Canvas Giao diện hệ thống HRM: https://claude.ai/artifact/9tE2VW2hyCZiw9U1qQrFwc | Bản cũ, chỉ để tham khảo |
| Logo HRM: https://claude.ai/artifact/1h1rCygNyjM9gW8nWnmciY | Logo. Bản xuất SVG/PNG nằm trong `brand/logo/` |

## 1. Design system

### 1.1 Brand DNA (lấy từ artifact HRM)
- **Ý tưởng:** con người, kết nối, tăng trưởng. Logo là 3 người đứng cạnh nhau, đồng thời trông như một biểu đồ cột đi lên.
- **Màu:**
  - `brand-blue #1E40AF` thể hiện sự tin cậy, dùng cho hành động chính, liên kết, trạng thái đang chọn. Hover dùng `brand-blue-deep #1E3A8A`, nền nhạt dùng `brand-blue-soft #DBEAFE`.
  - `brand-teal #14B8A6` thể hiện tăng trưởng, chỉ dùng cho đồ họa: tiến độ, xu hướng tích cực. Chiếm tối đa khoảng 10% màn hình. Khi cần teal cho chữ thì dùng `teal-text #0F766E`, nền nhạt dùng `brand-teal-soft #CCFBF1`.
  - Nền và chữ: `surface #FFFFFF`, `surface-muted #F8FAFC`, `line #E2E8F0`, `ink #0F172A`, `ink-muted #475569`, `danger #B91C1C`.
- **Chữ:**
  - **Inter** cho toàn bộ giao diện và tài liệu, vì có đủ dấu tiếng Việt. Manrope chỉ dùng cho logo.
  - Thang chữ: display 32/40, title 24/32, heading 18/26, body 15/22, body-strong 15/22 (đậm 500), caption 12/16.
  - Chữ số trong bảng dùng `tabular-nums` để thẳng cột.
- **Khoảng cách:** gốc 4px (4, 8, 12, 16, 24, 32).
- **Bo góc:** `sm 6`, `md 10` (nút, thẻ), `lg 14`, `full` (avatar, pill).
- **Bóng đổ:** ưu tiên viền hơn bóng. `shadow-sm` cho thẻ nổi trên nền muted, `shadow-lg` cho menu và dialog.
- **Focus ring:** cách phần tử 2px trắng, rồi 2px `brand-blue`.
- **Giọng văn:**
  - Nói rõ việc gì đã xảy ra và với ai: "Đã duyệt nghỉ phép cho Nguyễn Thị Hương", không viết "Thao tác thành công".
  - Ngày `dd/mm/yyyy`, giờ 24h, tiền `12.500.000 ₫`.
  - Viết hoa chữ cái đầu câu cho tiêu đề và nút. Không dùng emoji.

### 1.2 Phần cần bổ sung vào artifact HRM (làm trước tuần 1, chặn issue #01)
| Token / quy tắc | Giá trị đề xuất | Dùng cho |
|---|---|---|
| `warning` / `warning-soft` | `#B45309` / `#FEF3C7` | Chờ duyệt, Sắp hết hạn, cảnh báo bất thường |
| `info` | alias của `brand-blue-soft` | Banner thông tin |
| Thang heatmap theo **Tải phân bổ** | Bench < 50%: `surface-muted` · 50–90%: `brand-blue-soft` · 90–100%: `brand-blue` · > 100% (Quá tải): `danger` | #17. Mỗi ô luôn ghi kèm số %, không chỉ dựa vào màu |
| Bảng màu biểu đồ | 5 màu mở đầu bằng `brand-blue`. Teal dành cho "tăng trưởng / tích cực". Kiểm tra cho người mù màu | Dashboard, báo cáo |
| Bộ icon | **Lucide**, nét 1.5px, cỡ 16 và 20, màu theo chữ đi kèm | Toàn app |

### 1.3 Quy tắc giao diện sản phẩm (giữ lại từ bản cũ, đổi sang token HRM)
- **Badge trạng thái** là cặp chữ + nền nhạt, luôn có chữ (và icon nếu có), không chỉ dựa vào màu:
  - Đã duyệt / Đang làm việc: `teal-text` trên `brand-teal-soft`.
  - Chờ duyệt / Sắp hết hạn: `warning` trên `warning-soft`.
  - Từ chối / Lỗi / Đã nghỉ việc: `danger`, kèm icon.
- **Dữ liệu nhạy cảm** (lương, CCCD, số tài khoản) mặc định bị che một phần (`•••• 4821`). Chỉ người có quyền mới bấm xem được.
- **Bảng:**
  - tiêu đề cột dính khi cuộn,
  - căn phải cột số, căn trái mọi cột khác,
  - các dòng phân cách bằng `line`,
  - dòng đang chọn có nền `brand-blue-soft`.
- **Form:**
  - lỗi hiện bằng chữ `caption` màu `danger` ngay dưới trường, nói rõ nguyên nhân và cách sửa,
  - mỗi vùng chỉ có một nút chính,
  - nhãn nút là động từ ("Duyệt", "Lưu hợp đồng").
- **Hành động không hoàn tác được** luôn có hộp xác nhận nêu đúng đối tượng: "Chấm dứt hợp đồng của Nguyễn Văn An?".
- **Avatar** hình tròn. Không có ảnh thì hiện chữ viết tắt tên trên nền `brand-blue-soft`, chữ `brand-blue`.

## 2. Ánh xạ token sang code (làm trong issue #01)
- Token trở thành **CSS variables** theo quy ước theme của shadcn/ui:
  - `--primary` = `brand-blue`, `--primary-foreground` = `on-brand`
  - `--background` = `surface`, `--muted` = `surface-muted`, `--border` = `line`
  - `--foreground` = `ink`, `--muted-foreground` = `ink-muted`
  - `--destructive` = `danger`, `--ring` = `brand-blue`
  - Token bổ sung: `warning`, `success` (= `teal-text`), các mức heatmap.
- **`tailwind.config`:** colors theo tên token; `fontSize` theo 6 cấp chữ; spacing gốc 4px; `borderRadius` sm/md/lg/full; `boxShadow` sm/lg.
- **Inter tự host:** dùng các file woff2 lấy từ artifact HRM, không tải từ CDN.
- **Hàm format dùng chung:** ngày, giờ, tiền VND, phần trăm. Không component nào được tự format.

## 3. Các mẫu giao diện dùng chung (pattern)
Mỗi pattern vẽ một lần, code một lần. Các màn hình sau đó ghép từ pattern.

| # | Pattern | Dùng ở các issue |
|---|---|---|
| P1 | **App shell**: sidebar theo vai trò (HRM lockup on top), header (Company mark = the customer company's logo and name, tìm kiếm, chuông thông báo, menu người dùng, chuyển vi/en, Demo as…) | #01, #04, toàn app |
| P2 | **Trang danh sách**: thanh lọc, DataTable (tiêu đề dính, phân trang hoặc ảo hóa), thao tác hàng loạt, xuất Excel | #05, #06, #13, #14, #15, #32 |
| P3 | **Trang chi tiết có tab** | #06, #08–#11, #15 |
| P4 | **Form / dialog** | toàn app |
| P5 | **Wizard nhiều bước** (Tải lên → Kiểm tra lỗi theo dòng → Xác nhận) | #07, #23, #29 |
| P6 | **Dòng thời gian có ngày hiệu lực** | #10, #11, #28 |
| P7 | **Badge trạng thái + các bước duyệt** (cấp 1/2/3, duyệt thay, tự đẩy lên cấp trên) | #12, #18, #24, #25, #27, #30 |
| P8 | **Trường nhạy cảm bị che** | #06, #08, #10, #29, #31 |
| P9 | **Lịch tháng/tuần** (FullCalendar theo theme) | #19, #22, #26 |
| P10 | **Trạng thái rỗng / đang tải / lỗi**, hộp xác nhận | toàn app |
| P11 | **Khung mobile 390px** cho các màn hình nhân viên tự phục vụ | #18, #26, #27, #31, #33 |

## 4. Danh mục màn hình theo issue
**Mức H (Hero):** vẽ mockup trên canvas trước khi code, vì đây là màn hình dùng trong kịch bản demo.
**Mức P (Pattern):** code thẳng theo pattern, không cần mockup.

| Issue | Màn hình | Mức | Pattern | Thời điểm design |
|---|---|---|---|---|
| #00 | — (không có giao diện) | — | — | — |
| #01 | Đăng nhập, quên/đổi mật khẩu, App shell, bộ component dùng chung | H | P1, P4, P10 | Trước tuần 1 |
| #02 | Thông tin công ty (Card + Image upload); Company mark in the app shell header | P | P4, P1 | Tuần 1 |
| #03 | Cơ cấu tổ chức: cây + org chart (tree left + unit detail right; chart as a second tab; add/edit, move, deactivate and delete dialogs) | H | P3, P4, P10 | Tuần 1 |
| #04 | Tài khoản & vai trò (list, add / edit, set temporary password, lock), ma trận quyền (editable by an Account with `ACCOUNT_EDIT`: a checkbox per role and permission, the Admin column and the base permissions locked, ticking an edit permission also ticks its view permission and unticking the view unticks the edit, every role saved together with one explicit save, one "Khôi phục mặc định" for all roles; read-only otherwise), Demo as… (header, and the nav drawer at 390). Pattern level P, drawn on the canvas at the owner's request before frontend work | P (drawn) | P1, P2, P4, P10 | Tuần 1 |
| #05 | Danh mục (một mẫu dùng chung). Done: drawn at the owner's request and approved on 06/10/2026 on the temporary canvas https://claude.ai/artifact/ELuU7ZU8H84ytg8tqRX4EE; copied into the main canvas on 13/10/2026 as row `#05`: `#05 Danh mục (Chức danh)` (1440 × 900), `#05 Danh mục (cột theo danh mục)` (1440 × 1240), `#05 Danh mục (hộp thoại)` (1440 × 1080), `#05 Danh mục (thao tác trên dòng)` (1440 × 820), `#05 Danh mục (trạng thái)` (1440 × 960), `#05 Danh mục (390)` (390 × 844). Spec: comments on issue #7. Built in HRM-05 FE-1 to FE-3 | P (drawn, approved) | P2, P4, P10, P11 | Tuần 1 |
| #06 | Danh sách NV (cập nhật artboard đã có), khung Hồ sơ NV, form tạo NV. Done: approved on 06/10/2026 on the temporary canvas https://claude.ai/artifact/KW4aVrbiQYWvVVJTANMUNM; copied into the main canvas on 13/10/2026 as row `#06` (it supersedes the old "Danh sách nhân viên" artboard there): `#06 Danh sách nhân viên` (1440 × 1640), `#06 Danh sách nhân viên (trạng thái)` (1440 × 1680), `#06 Hồ sơ nhân viên (Cá nhân)` (1440 × 1100), `#06 Hồ sơ nhân viên (Công việc)` (1440 × 900), `#06 Hồ sơ nhân viên (tab chưa có)` (1440 × 860), `#06 Sửa Thông tin cá nhân` (1440 × 1280), `#06 Sửa Vị trí công việc` (1440 × 1160), `#06 Thêm nhân viên` (1440 × 1680), `#06 Hồ sơ nhân viên (trạng thái)` (1440 × 1500), `#06 Nhân viên (390)` (390 × 844), `#06 Lọc nhân viên (390)` (390 × 844), `#06 Hồ sơ nhân viên (390)` (390 × 844). Spec and decisions: comments on issue #8. Built in HRM-06 FE-1 to FE-5 | H (approved) | P2, P3, P8 | Tuần 1 |
| #07 | Wizard import nhân viên | P | P5 | Tuần 1 |
| #08 | Các tab Ngân hàng, Người phụ thuộc, BHXH, Tài liệu, Giấy tờ expat | P | P3, P8 | Tuần 1 |
| #09 | Tab Kỹ năng | P | P3 | Tuần 1 |
| #10 | Tab Hợp đồng + dòng thời gian Hồ sơ lương + xem trước file xuất | H | P3, P6, P8 | Tuần 1 |
| #11 | Dòng thời gian quá trình công tác, thử việc, dialog nghỉ việc | P | P6, P4 | Tuần 1 |
| #12 | Hộp thư duyệt, chi tiết yêu cầu (các bước duyệt), cấu hình luồng duyệt, ủy quyền, chuông thông báo. Done: artboards approved by the owner on 09/10/2026 on the temporary canvas https://claude.ai/artifact/Vj77N7DARatWwgqScqh42E; copied into the main canvas on 13/10/2026 as row `#12`: `#12 Hộp thư duyệt` (1440 × 1060), `#12 Chi tiết yêu cầu` (1440 × 1180), `#12 Hộp thư duyệt (390)` (390 × 844), `#12 Chi tiết yêu cầu (390)` (390 × 844), `#12 Chi tiết yêu cầu (hộp thoại)` (1440 × 880), `#12 Chuông thông báo và email` (1440 × 1000), `#12 Cấu hình luồng phê duyệt` (1440 × 1180), `#12 Ủy quyền duyệt` (1440 × 1420), `#12 Luồng duyệt (trạng thái)` (1440 × 1900). Spec and decisions: comments on issue #14. Built in HRM-12 FE-1 to FE-6; the example data seeds a filled inbox for the demo personas | H (approved) | P2, P7 | Tuần 1 |
| #13 | Audit log (danh sách + so sánh trước/sau) | P | P2 | Tuần 2 |
| #14 | Danh sách sắp hết hạn | P | P2, P7 | Tuần 2 |
| #15 | Danh sách dự án, chi tiết dự án, dialog phân bổ + **cảnh báo quá tải**. Done: approved on 10/10/2026 on the temporary canvas https://claude.ai/artifact/KLFA9sQTPHaAxfscWo9Ewm; copied into the main canvas on 13/10/2026 as row `#15`: `#15 Danh sách dự án` (1440 × 860), `#15 Chi tiết dự án` (1440 × 1180), `#15 Danh sách dự án (390)` (390 × 844), `#15 Phân bổ nhân sự (hộp thoại)` (1440 × 1540), `#15 Dự án (hộp thoại)` (1440 × 1460), `#15 Dự án (trạng thái)` (1440 × 1660). Spec and the 9 decisions: comments on issue #17. Built in HRM-15 (BE-1 to INT-1); the example projects of the artboards (DA-031, DA-029 with the Cao Minh Trí overlap, DA-027, DA-033, DA-018) are seeded with the example data, and `web/e2e/projects-flow.mjs` walks the screens as the Admin, the PM persona (1440 and 390) and the Giám đốc persona | H (approved) | P2, P3, P4, P10, P11 | Tuần 2 |
| #16 | Drawer tìm người theo kỹ năng | H | P4 | Tuần 2 |
| #17 | **Resource heatmap**, bench, dashboard dự án | H | thang heatmap | Tuần 2 |
| #18 | Chính sách phép, **form xin nghỉ (mobile)**, thẻ số dư phép | H | P4, P7, P11 | Tuần 3 |
| #19 | Lịch nghỉ phép | P | P9 | Tuần 3 |
| #20 | Dashboard v1 theo vai trò (cập nhật artboard "Tổng quan") | H | P1, biểu đồ | Tuần 3 |
| #21 | — (seed dữ liệu và persona) | — | — | — |
| #22 | Ca làm việc, lịch phân ca | P | P4, P9 | Tuần 4 |
| #23 | Wizard import log, công theo ngày có đánh dấu bất thường | H | P5, P2 | Tuần 4 |
| #24 | Đơn bổ sung công, nhập công thủ công | P | P4, P7 | Tuần 4 |
| #25 | Đơn OT | P | P4, P7 | Tuần 4 |
| #26 | Bảng công tháng + khóa kỳ công, **lịch công của tôi (mobile)** | H | P2, P9, P11 | Tuần 4 |
| #27 | Timesheet tuần (desktop + mobile), PM duyệt | H | P2, P7, P11 | Tuần 4 |
| #28 | Tham số lương (bảng có ngày hiệu lực), thành phần lương | P | P6, P2 | Tuần 5 |
| #29 | **Wizard kỳ lương Setup → Preview → Confirm**, drawer chi tiết từng người, cảnh báo bất thường | H | P5, P2, P8 | Tuần 5 |
| #30 | Duyệt bảng lương, khóa / mở khóa (kèm lý do) | P | P7, P4 | Tuần 5 |
| #31 | **Phiếu lương web/mobile + template PDF**, xuất file ngân hàng | H | P8, P11 | Tuần 5 |
| #32 | Khung báo cáo dùng chung + 6 template Excel | P | P2 | Tuần 6 |
| #33 | Dashboard v2, rà soát toàn bộ mobile | H | P11, biểu đồ | Tuần 6 |
| #34 | — (seed dữ liệu và kịch bản demo) | — | — | — |
| #35 | Chi phí nhân sự dự án | P | P2, biểu đồ | Khi làm P1 |
| #36 | Yêu cầu nhân sự | P | P4, P7 | Khi làm P1 |
| #37 | Commission | P | P2, P4 | Khi làm P1 |

## 5. Canvas & quy trình
- **Canvas chính** có các trang theo milestone: *Nền tảng · Hồ sơ · Dự án · Nghỉ phép · Chấm công · Lương · Mobile*.
- Desktop vẽ ở 1440, mobile ở 390. Mỗi artboard đặt **tiêu đề theo số issue**, ví dụ "#17 Resource heatmap".
- **Dữ liệu trong mockup lấy theo persona seed** (tên Việt, phòng ban, dự án như trong kịch bản demo). Không dùng lorem ipsum hay số liệu bịa.
- **Thuật ngữ trên giao diện dùng đúng glossary** trong `docs/contexts/*/CONTEXT.md`, ví dụ "Tải phân bổ", "Công chuẩn", "Quản lý trực tiếp".
- **Review trước khi merge:** với mỗi issue có giao diện, chạy `web-design-guidelines` (tải bộ quy tắc mới nhất) và `design:accessibility-review` trên code UI của issue đó.

### 5.1 Library additions still to make

Every approved artboard is on the main canvas. The earlier temporary canvases (`#05`, `#06`, `#12`, `#15`) are kept for history only; the main canvas is the source for FE. Some artboards still draw library pieces inline that the HRM design system does not have yet: #06: TreeSelect, SearchSelect, MaskedValue, ProfileHeader, Radio; #12: Approval steps, Notification item, nav item count; #15: Allocation load row, small heat cell. They are added to the design system (preview, README, `components/bundle.css`) separately.

## 6. Lịch design theo tuần
| Tuần | Design làm | Dev làm cùng lúc |
|---|---|---|
| 0 | Bổ sung design system (1.2), App shell, Đăng nhập, bộ pattern P1–P5 | #00 |
| 1 | #03, #06, #10, #12 (hero) | #01–#05 |
| 2 | #15, #16, #17 (hero dự án) | #06–#14 |
| 3 | #18 (mobile), #20 dashboard v1 | #15–#17 |
| 4 | #23, #26, #27 (chấm công, timesheet, mobile) | #18–#21 (Demo v1) |
| 5 | #29, #31 (lương, phiếu lương) | #22–#27 |
| 6 | #33 dashboard v2, rà soát mobile | #28–#31 |
| 7–8 | Hoàn thiện theo phản hồi demo | #32–#34 |
