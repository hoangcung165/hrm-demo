# HRM Demo

Web app quản lý nhân sự (HRM) bản demo, làm trong 8 tuần để đi chào khách. Phạm vi: một công ty (một Pháp nhân); hồ sơ nhân viên, dự án và phân bổ nhân sự, nghỉ phép, chấm công, tính lương/BHXH/thuế TNCN.

File này là hướng dẫn chung cho **mọi agent** (Claude Code, Codex…) và cho dev trong đội. `CLAUDE.md` chỉ import file này.

## Đọc trước khi làm

| Cần biết | Ở đâu |
|---|---|
| Phạm vi và user stories | Issue PRD trên GitHub (nhãn `prd`); bản gốc `docs/prd/hrm-demo.md` |
| Tính năng, chiến lược demo | `HRM_Demo_Features.md` |
| Quyết định kiến trúc | `docs/adr/` (0001 tech stack, 0002 monolith phân tầng, 0003 một Pháp nhân, 0004 ranh giới Hồ sơ lương) |
| Thuật ngữ nghiệp vụ | `CONTEXT-MAP.md` → `docs/contexts/<context>/CONTEXT.md` |
| Design | `docs/design/DESIGN_PLAN.md`; token chuẩn ở design system HRM https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp |
| Quy trình làm việc | `docs/agents/workflow.md` |

**Stack:** Spring Boot (monolith 3 tầng Controller → Service → Repository, Security, Data JPA) + React/TypeScript/Vite + Tailwind/shadcn + PostgreSQL. Danh sách thư viện: phần Comments của issue `[HRM-00]`.

## Quy tắc bắt buộc

- **Không đọc, không mở, không commit** các thư mục tài liệu khách hàng trong `docs/` (mã hồ sơ dạng `docs/2xxxx…/`, `docs/OneDrive_*/`; đã nằm trong `.gitignore`). Đó là tài liệu thật của khách hàng, có NDA. Không đưa tên khách hàng vào code, dữ liệu seed hay tài liệu.
- **Không push thẳng vào `main`.** Mọi thay đổi đi qua branch + PR.
- **Dùng đúng thuật ngữ trong glossary** cho tên class, bảng, API, issue, test. Thuật ngữ mới → cập nhật `CONTEXT.md` của context tương ứng.
- **Tôn trọng ADR.** Muốn làm khác thì nói rõ trong PR, không âm thầm làm ngược.
- **Chỉ làm 1 issue mỗi lúc**, và chỉ issue mình đã nhận theo quy trình dưới đây.

## Quy trình làm việc (tóm tắt, chi tiết ở `docs/agents/workflow.md`)

1. **Chọn việc:** issue đang mở có `status:ready` và `ready-for-agent` (agent) hoặc `ready-for-human` (người). Ưu tiên `milestone:demo-v1`, rồi mã `HRM-xx` nhỏ hơn.
2. **Nhận việc:** issue chưa có nhãn `agent:*` → thay `status:ready` bằng `status:in-progress`, thêm `agent:claude` / `agent:codex` / `agent:human`, comment "Đang làm: <agent>, branch `hrm-xx-slug`".
3. **Làm:** branch `hrm-xx-slug` từ `main` (cùng máy thì mỗi agent một git worktree). Viết test theo mục Testing của PRD và tiêu chí nghiệm thu.
4. **PR:** tiêu đề `[HRM-xx] …`, body theo PR template, có `Closes #<số issue>`; đổi nhãn issue sang `status:in-review`. Nhờ agent khác review chéo. Người phải duyệt PR có `type:hitl`, `area:payroll`, hoặc sửa `docs/adr/`.
5. **Sau merge:** issue tự đóng. Gỡ nhãn `agent:*`. Rà các issue `status:blocked`: issue nào mọi issue chặn đã đóng → đổi sang `status:ready`.
6. **Bị kẹt:** thêm `needs-info`, comment câu hỏi cụ thể, gỡ `agent:*`, trả về `status:ready`.

## Báo cáo trạng thái

Khi được hỏi "dự án đang thế nào" (hoặc `/hrm-status` trong Claude Code), đọc issue của repo `hoangcung165/hrm-demo` qua GitHub MCP (nếu thấy được repo private), `gh`, hoặc GitHub REST API bằng thông tin đăng nhập git trên máy, rồi báo cáo theo đúng các bước trong `.claude/skills/hrm-status/SKILL.md`.

## Build & test

_Sẽ điền khi xong `[HRM-01]` (khung dự án)._ Dự kiến: `./gradlew test` (backend), `npm test` trong `web/` (frontend), `docker compose up` (chạy toàn bộ).

## Skills dùng chung của dự án

Skill nằm **ngay trong repo**, nên agent nào clone về cũng có sẵn, không cần cài:
- `.claude/skills/` cho Claude Code
- `.agents/skills/` cho Codex và các agent đọc chuẩn Agent Skills

| Skill | Dùng khi | Nguồn |
|---|---|---|
| `java-springboot` | Viết hoặc review code backend Spring Boot | `github/awesome-copilot`, khóa phiên bản trong `skills-lock.json` |
| `hrm-status` | Báo cáo trạng thái dự án | Viết riêng cho dự án; `.agents/skills/hrm-status` là symlink tới bản trong `.claude/skills/` |

**Khi skill mâu thuẫn với ADR hoặc glossary, ADR và glossary thắng.** Ví dụ: package theo tầng rồi theo tính năng (ADR 0002), giữ đúng tên thuật ngữ trong `CONTEXT.md`.

**Thêm một skill mới cho cả đội:**
```bash
npx skills add <repo> --skill <tên> --agent claude-code codex --copy -y
```
Sau đó commit thư mục skill ở cả 2 nơi cùng file `skills-lock.json`, qua PR như mọi thay đổi khác.

**Cập nhật hoặc khôi phục:** `npx skills update -p -y` để cập nhật, `npx skills experimental_install` để cài lại theo `skills-lock.json`.

## Agent skills (mattpocock-skills)

### Issue tracker

Issue và PRD nằm trên GitHub Issues của repo `hoangcung165/hrm-demo`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: `CONTEXT-MAP.md` at the root points to per-context docs under `docs/contexts/<context>/`. See `docs/agents/domain.md`.

### Design

Nguồn token chuẩn là design system HRM https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp; canvas chính https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk. Kế hoạch và danh mục màn hình theo issue: `docs/design/DESIGN_PLAN.md`.
