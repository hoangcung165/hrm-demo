# Quy trình làm việc

Áp dụng cho mọi người tham gia: Claude Code, Codex (CLI và cloud), dev trong đội. Nguồn sự thật duy nhất là **GitHub Issues** của repo `hoangcung165/hrm-demo`.

## Ngôn ngữ

| Nội dung | Ngôn ngữ |
|---|---|
| Trao đổi giữa người dùng và agent (chat, câu hỏi, báo cáo trạng thái) | Tiếng Việt |
| Code, comment trong code, commit, tên branch | Tiếng Anh, ngắn gọn |
| Issue, PR, comment trên GitHub | Tiếng Anh |
| Tài liệu (`docs/`, ADR, `CONTEXT.md`…) | Tiếng Anh cho nội dung mới; tài liệu cũ dịch dần khi sửa tới |

Thuật ngữ nghiệp vụ vẫn theo glossary: tên tiếng Anh dùng trong code, tên tiếng Việt giữ trong `CONTEXT.md` để đối chiếu.

## Trạng thái của một issue

Trạng thái được ghi bằng **nhãn**, để mọi agent đọc và sửa được qua GitHub MCP hoặc `gh`.

```
status:blocked ──(mọi issue chặn đã đóng)──▶ status:ready ──(nhận việc)──▶ status:in-progress
      ▲                                           ▲                                │
      │                                           └────(bị kẹt: needs-info)────────┤
      │                                                                            ▼
      └──────────────────────────────── Done = issue đóng ◀──(merge)── status:in-review
```

Một issue chỉ có **đúng một** nhãn `status:*` khi đang mở. Issue đã đóng không cần nhãn `status:*`.

## Bộ nhãn

| Nhóm | Nhãn | Ý nghĩa |
|---|---|---|
| Tiến độ | `status:blocked` · `status:ready` · `status:in-progress` · `status:in-review` | Xem sơ đồ trên |
| Ai đang làm | `agent:claude` · `agent:codex` · `agent:human` | Gắn khi nhận việc, gỡ khi xong hoặc bỏ |
| Phân loại (triage) | `ready-for-agent` · `ready-for-human` · `needs-info` · `needs-triage` · `wontfix` | Xem `triage-labels.md` |
| Loại việc | `type:afk` · `type:hitl` | AFK: agent tự làm được. HITL: cần người quyết định hoặc review |
| Vùng | `area:org` · `area:people` · `area:time` · `area:payroll` · `area:projects` · `area:infra` · `area:design` | Theo context trong `CONTEXT-MAP.md` |
| Mốc | `milestone:demo-v1` · `milestone:demo-v2` · `milestone:p1` | Demo v1 = tuần 4, Demo v2 = tuần 8, P1 = làm nếu kịp |
| Khác | `prd` | Issue PRD, cha của mọi issue việc |

## Các bước

### 1. Chọn việc
- Lọc issue đang mở có `status:ready`.
- Agent chỉ chọn issue có `ready-for-agent`. Người chọn issue có `ready-for-human` (thường là `type:hitl`), hoặc bất kỳ issue nào nếu muốn.
- Ưu tiên `milestone:demo-v1`, rồi đến mã `HRM-xx` nhỏ hơn.

### 2. Nhận việc (claim)
- Đọc lại issue: nếu đã có nhãn `agent:*` thì **không nhận**, chọn việc khác.
- Thay `status:ready` bằng `status:in-progress`, thêm `agent:<tên>`, assign cho mình nếu là người.
- Comment: `Đang làm: <agent>, branch hrm-xx-slug`.
- Mỗi agent hoặc người làm **tối đa 1 issue** cùng lúc.

### 3. Làm
- Branch `hrm-xx-slug` tách từ `main` mới nhất.
- Làm ngay trong thư mục repo chính, chỉ tách branch (`git checkout -b hrm-xx-slug main`). **Không dùng git worktree**, không tạo thư mục làm việc riêng.
- Trước khi đổi branch phải commit hoặc stash hết thay đổi. Vì mọi agent dùng chung một thư mục, mỗi lúc trên một máy chỉ một agent được code.
- Đọc PRD (mục Implementation/Testing Decisions), ADR, glossary và mục Design của issue trước khi code.
- Viết test theo tiêu chí nghiệm thu. Module lõi (lương, chấm công, phép, phân bổ, luồng duyệt, phạm vi truy cập) bắt buộc có unit test.

### 4. Mở PR
- Tiêu đề `[HRM-xx] <tên issue>`; body theo PR template, có `Closes #<số issue>`.
- Đổi nhãn issue sang `status:in-review`.
- **Review:**
  - Nhờ agent khác review chéo (Codex review PR của Claude và ngược lại).
  - **Người phải duyệt** khi PR thuộc issue `type:hitl`, `area:payroll`, hoặc sửa `docs/adr/`.

### 5. Sau khi merge
- Issue tự đóng nhờ `Closes #…`. Gỡ nhãn `agent:*`.
- **Mở khóa việc tiếp theo:** rà các issue có `status:blocked`. Issue nào có mọi issue trong mục "Blocked by" đã đóng thì đổi sang `status:ready`.

### 6. Bị kẹt
- Thêm `needs-info`, comment câu hỏi cụ thể (cần ai trả lời, trả lời cái gì).
- Gỡ `agent:*`, đổi về `status:ready` để người khác có thể nhận khi đã có câu trả lời.

## Definition of Done
- [ ] Tick đủ tiêu chí nghiệm thu của issue.
- [ ] Có test theo PRD; CI xanh.
- [ ] Dùng đúng thuật ngữ trong glossary; thuật ngữ hoặc quyết định mới đã được ghi vào `CONTEXT.md` hoặc ADR.
- [ ] Không vi phạm ADR (hoặc PR nêu rõ lý do).
- [ ] Issue có giao diện: đã review bằng `web-design-guidelines` và `design:accessibility-review`.

## Theo dõi trạng thái
- **Báo cáo:** `/hrm-status` trong Claude Code, hoặc hỏi Codex "dự án đang thế nào" (cùng quy trình, xem `.claude/skills/hrm-status/SKILL.md`).
- **Bảng Kanban:** GitHub Project "HRM Demo" (cài đặt bên dưới).
- **Thanh % theo milestone:** trang Milestones của repo.

## Cài đặt một lần trên GitHub (người làm, khoảng 5 phút)

Nhãn, 3 milestone (`Demo v1 (tuần 4)`, `Demo v2 (tuần 8)`, `P1`) và 39 issue đã được tạo sẵn. Còn lại cần làm tay một lần:

1. ~~Milestones~~ — đã có.
2. **Project** (tab Projects → New project → Board), đặt tên `HRM Demo`:
   - Workflows → bật **Auto-add to project** cho repo `hrm-demo`, lọc `is:issue`.
   - Thêm cột: Blocked, Ready, In progress, In review, Done. Mỗi cột là một view lọc theo nhãn, ví dụ `label:status:ready is:open`. Hoặc dùng một view Board nhóm theo trường Labels.
   - Thêm view Table nhóm theo Milestone để xem tiến độ.
3. **Bảo vệ nhánh** (Settings → Branches → Add rule cho `main`):
   - Require a pull request before merging, 1 approval.
   - Sau khi `[HRM-01]` có CI: bật Require status checks to pass.
4. **Codex cloud:** trong cài đặt Codex, kết nối repo `hoangcung165/hrm-demo`. Script setup môi trường sẽ có ở `[HRM-01]`.
