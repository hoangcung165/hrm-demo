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

## Slices: one issue, several small PRs

An `[HRM-xx]` issue is usually too big for one PR. Before any code is written, the orchestrator splits it into **slices**, each a GitHub sub-issue of the `[HRM-xx]` issue with its own branch and its own PR. Reviewing and merging happen slice by slice.

**When to split.** Always, unless the whole issue fits one slice by the limits below. In particular split when the issue has both backend and UI, more than one screen or dialog group, or more than one group of endpoints.

**What a slice is.**
- One thing a reviewer can check in one sitting: one screen, one dialog group, one group of endpoints, or one library component set.
- It leaves `main` working and can be shown on its own (a read-only screen is a valid slice; so is an API with tests and no UI yet).
- Size target: about half a day of work and about 400 changed lines outside tests and generated files. Past roughly 800 lines or 25 files, split again.
- It has its own acceptance criteria, taken from the parent's criteria or the design spec. Every parent criterion belongs to at least one slice.

**Naming.** `[HRM-xx/BE-n]`, `[HRM-xx/FE-n]`, `[HRM-xx/INT-n]` (integration: end-to-end test, seed, wiring), `[HRM-xx/OPS-n]`. Branch `hrm-xx-<be1|fe1|…>-slug`.

**Usual order.**
1. Design spec (and the approved artboard for hero screens) on the parent issue.
2. `BE-n`: one slice per group of endpoints, each with its tests. The `## API contract` comment goes on the parent.
3. `FE-1`: the main screen read-only (list, tree or detail with loading, empty, error and denied states) plus the library components it needs.
4. `FE-2…`: one slice per action or dialog group (create/edit; move; deactivate/delete; a second tab or view…). A library component lands with the first slice that uses it.
5. `INT-1` when the parent needs an end-to-end check across slices.

Example: HRM-03 has four artboards (unit tree, org chart, dialogs, states), so it is `BE-1` org unit API, `FE-1` unit tree read-only, `FE-2` add and edit, `FE-3` move, deactivate, reactivate and delete, `FE-4` org chart.

**Rules.**
- **The parent `[HRM-xx]` issue stays open** with `status:in-progress` while its slices are worked on, and lists them as a checklist in a comment. Its design spec, API contract and decisions stay on the parent.
- **A slice PR closes only its slice:** `Closes #<slice issue>`, never `Closes #<parent>`. Mention the parent as `Part of #<parent>`.
- Each slice goes through steps 2 to 5 below like any issue (claim, branch, PR, review, merge). One slice in progress per agent at a time; the next slice starts from the updated `main` after the previous one is merged.
- Slice issues carry the parent's `type:*`, `area:*` and `milestone:*` labels and their own `status:*`. "Blocked by" lists the earlier slices they need.
- **Closing the parent:** when every slice is closed, the orchestrator ticks the parent's acceptance criteria, closes the parent, removes `agent:*`, and unblocks the issues waiting on it (step 5). Issues blocked by `[HRM-xx]` wait for the parent, not for a slice.
- A slice that turns out too big is split again before its PR is opened, not after.
- **Evidence for every UI slice:** a slice that adds or changes a screen also adds its steps to an end-to-end flow in `web/e2e/<feature>-flow.mjs` (new flows are added to the E2E job in `.github/workflows/ci.yml` and to `FLOWS` in `.github/scripts/e2e-evidence.py` with the paths they cover). CI runs every flow against the real stack and posts the screenshots of the flows this PR touched. A UI slice PR is not ready for review until that evidence comment shows the new screen, in the states the slice adds.

## Các bước

### 1. Chọn việc
- Lọc issue đang mở có `status:ready`.
- Agent chỉ chọn issue có `ready-for-agent`. Người chọn issue có `ready-for-human` (thường là `type:hitl`), hoặc bất kỳ issue nào nếu muốn.
- Ưu tiên `milestone:demo-v1`, rồi đến mã `HRM-xx` nhỏ hơn.

### 2. Nhận việc (claim)
- Đọc lại issue: nếu đã có nhãn `agent:*` thì **không nhận**, chọn việc khác.
- Thay `status:ready` bằng `status:in-progress`, thêm `agent:<tên>`, assign cho mình nếu là người.
- Comment: `Đang làm: <agent>, branch hrm-xx-slug`.
- Mỗi agent hoặc người làm **tối đa 1 issue** cùng lúc. With slices (see above): claim the parent once, then one slice at a time.

### 3. Làm
- Branch `hrm-xx-slug` tách từ `main` mới nhất.
- Làm ngay trong thư mục repo chính, chỉ tách branch (`git checkout -b hrm-xx-slug main`). **Không dùng git worktree**, không tạo thư mục làm việc riêng.
- Trước khi đổi branch phải commit hoặc stash hết thay đổi. Vì mọi agent dùng chung một thư mục, mỗi lúc trên một máy chỉ làm **một branch**.
- **Role agents (Design, BE, FE):** may run in parallel on the same branch because each edits only its own paths and only the orchestrator runs git. See `docs/agents/team.md`.
- Đọc PRD (mục Implementation/Testing Decisions), ADR, glossary và mục Design của issue trước khi code.
- Viết test theo tiêu chí nghiệm thu. Module lõi (lương, chấm công, phép, phân bổ, luồng duyệt, phạm vi truy cập) bắt buộc có unit test.

### 4. Mở PR
- Tiêu đề `[HRM-xx] <tên issue>`; body theo PR template, có `Closes #<số issue>`. A slice PR is titled `[HRM-xx/FE-n] …` and closes only its slice issue.
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
