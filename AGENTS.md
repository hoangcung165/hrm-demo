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
| Demo database (Supabase): setup, backups | `docs/ops/database.md` |
| Design | `docs/design/DESIGN_PLAN.md`; token chuẩn ở design system HRM https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp |
| Quy trình làm việc | `docs/agents/workflow.md` |
| Frontend code rules (structure, no god files) | `docs/agents/frontend-rules.md` |
| Agent team (Design, BE, FE, Tester): ownership, hand-offs | `docs/agents/team.md`; subagents in `.claude/agents/hrm-*.md` |

**Stack:** Spring Boot (monolith 3 tầng Controller → Service → Repository, Security, Data JPA) + React/TypeScript/Vite + Tailwind/shadcn + PostgreSQL. Danh sách thư viện: phần Comments của issue `[HRM-00]`.

## Quy tắc bắt buộc

- **Không đọc, không mở, không commit** các thư mục tài liệu khách hàng trong `docs/` (mã hồ sơ dạng `docs/2xxxx…/`, `docs/OneDrive_*/`; đã nằm trong `.gitignore`). Đó là tài liệu thật của khách hàng, có NDA. Không đưa tên khách hàng vào code, dữ liệu seed hay tài liệu.
- **Không push thẳng vào `main`.** Mọi thay đổi đi qua branch + PR.
- **Dùng đúng thuật ngữ trong glossary** cho tên class, bảng, API, issue, test. Thuật ngữ mới → cập nhật `CONTEXT.md` của context tương ứng.
- **Tôn trọng ADR.** Muốn làm khác thì nói rõ trong PR, không âm thầm làm ngược.
- **Ngôn ngữ:** chỉ trao đổi với người dùng (chat với agent) bằng **tiếng Việt**. Mọi thứ còn lại viết bằng **tiếng Anh**: code, comment, commit, tên branch, PR, issue, comment trên GitHub, tài liệu mới. Tài liệu tiếng Việt hiện có được dịch dần khi sửa tới.
- **Chỉ làm 1 issue mỗi lúc** (với issue đã chia nhỏ: mỗi lúc một slice), và chỉ issue mình đã nhận theo quy trình dưới đây.
- The Tester is a verification role: it may test one user-selected feature or epic at a time, including a closed issue, without claiming that implementation issue. It may post only the resulting test-report comment to the matched issue; it does not change issue state, labels, code, or PRs.

## Quy trình làm việc (tóm tắt, chi tiết ở `docs/agents/workflow.md`)

1. **Chọn việc:** issue đang mở có `status:ready` và `ready-for-agent` (agent) hoặc `ready-for-human` (người). Ưu tiên `milestone:demo-v1`, rồi mã `HRM-xx` nhỏ hơn.
2. **Nhận việc:** issue chưa có nhãn `agent:*` → thay `status:ready` bằng `status:in-progress`, thêm `agent:claude` / `agent:codex` / `agent:human`, comment "Đang làm: <agent>, branch `hrm-xx-slug`".
3. **Chia nhỏ (slices):** trước khi code, tách issue thành các phần nhỏ `[HRM-xx/BE-n]`, `[HRM-xx/FE-n]`… (mỗi phần một màn hình, một nhóm dialog hoặc một nhóm endpoint; khoảng nửa ngày, ~400 dòng). Mỗi phần là một sub-issue, một branch, một PR riêng, merge xong mới làm phần kế. Issue cha mở cho tới khi mọi phần đã đóng; PR của một phần chỉ `Closes` sub-issue của nó, không `Closes` issue cha. Phần có giao diện phải kèm bước E2E trong `web/e2e/*-flow.mjs` để CI chụp evidence màn hình mới lên PR. Quy tắc: `docs/agents/workflow.md`, mục "Slices".
4. **Làm:** branch `hrm-xx-slug` (hoặc `hrm-xx-<slice>-slug`) từ `main`, làm ngay trong thư mục repo (không dùng git worktree). Viết test theo mục Testing của PRD và tiêu chí nghiệm thu.
5. **PR:** tiêu đề `[HRM-xx] …`, body theo PR template, có `Closes #<số issue>`; đổi nhãn issue sang `status:in-review`. Nhờ agent khác review chéo. Người phải duyệt PR có `type:hitl`, `area:payroll`, hoặc sửa `docs/adr/`.
6. **Sau merge:** issue tự đóng. Gỡ nhãn `agent:*`. Khi mọi slice của một issue cha đã đóng: tick tiêu chí nghiệm thu, đóng issue cha. Rà các issue `status:blocked`: issue nào mọi issue chặn đã đóng → đổi sang `status:ready`.
7. **Bị kẹt:** thêm `needs-info`, comment câu hỏi cụ thể, gỡ `agent:*`, trả về `status:ready`.

## Báo cáo trạng thái

Khi được hỏi "dự án đang thế nào" (hoặc `/hrm-status` trong Claude Code), đọc issue của repo `hoangcung165/hrm-demo` qua GitHub MCP (nếu thấy được repo private), `gh`, hoặc GitHub REST API bằng thông tin đăng nhập git trên máy, rồi báo cáo theo đúng các bước trong `.claude/skills/hrm-status/SKILL.md`.

## Build & test

**Run the whole system (one command).** Needs Docker only.

```bash
docker compose up --build
```

- App: http://localhost:8080 (web UI and API in one image, ADR 0001). Sign in with `admin@hrm.local` / `admin12345`, the local defaults from `docker-compose.yml`.
- Mail: http://localhost:8025 (Mailpit; password reset mails land here).
- Override defaults in a `.env` file (see `.env.example`). Set real `HRM_JWT_SECRET` and `HRM_ADMIN_PASSWORD` on any shared or demo machine.
- Example data: the local compose stack and the `dev` profile fill an empty database with a fictional company, its org units and Employees, and, with the demo personas on, a few approval requests and one delegation for them (`HRM_EXAMPLE_DATA=false` turns it off; it is off in `docker-compose.prod.yml`).
- Demo personas: the local compose stack and the `dev` profile seed one Account per role (`demo.<role>@hrm.local`), and any signed-in user can switch to one with "Demo as…" (`HRM_DEMO_PERSONAS=false` turns it off; it is off in `docker-compose.prod.yml` unless set). While it is on, any signed-in Account can become Admin, so never enable it on real data.

**Demo deployment.** The demo runs against a managed PostgreSQL on Supabase (schema `hrm`), not the `db` container: `docker compose -f docker-compose.prod.yml up -d --build` with the database settings in `.env`. Setup, keep-alive, backups and restore: `docs/ops/database.md`.

**Develop with hot reload.** Needs JDK 21, Node 22 (`web/.nvmrc`) and Docker.

```bash
docker compose up db mail                                    # PostgreSQL + Mailpit
./gradlew bootRun --args='--spring.profiles.active=dev'      # backend on :8080, seeds the dev Admin
cd web && npm install && npm run dev                         # web on :5173, proxies /api to :8080
```

**Tests.**

| What | Command | Notes |
|---|---|---|
| Backend unit + integration | `./gradlew test` | Integration tests (`*IT`) start PostgreSQL with Testcontainers, so Docker must run. |
| Web unit | `cd web && npm test` | Vitest + Testing Library; MSW replaces the network. |
| Web types and build | `cd web && npx tsc --noEmit -p . && npm run build` | |
| End to end | `cd web && BASE_URL=http://localhost:8080 node e2e/auth-flow.mjs` | Against the compose stack; changes the Admin password, so use a throwaway database. First run: `npx playwright install chromium`. |
| End to end, org screens | `cd web && BASE_URL=http://localhost:8080 HRM_ADMIN_PASSWORD=<current> node e2e/org-flow.mjs` | Walks `/org` against the real stack and writes screenshots; creates a small org tree through the API when the database has no unit. |
| End to end, account screens | `cd web && BASE_URL=http://localhost:8080 HRM_ADMIN_PASSWORD=<current> node e2e/accounts-flow.mjs` | Walks `/accounts` against the real stack; creates 25 fictional Accounts with a known temporary password and adds, locks, unlocks and resets one more, so use a throwaway database, never the demo database. |
| End to end, roles and permissions | `cd web && BASE_URL=http://localhost:8080 HRM_ADMIN_PASSWORD=<current> node e2e/roles-flow.mjs` | Walks the "Vai trò và quyền" tab against the real stack (editing, the leave guard, "Khôi phục mặc định", the keyboard); resets the role permissions to the defaults before and after, changes them in between and creates one fictional HR Account, so use a throwaway database, never the demo database. |
| End to end, Demo as… | `cd web && BASE_URL=http://localhost:8080 HRM_ADMIN_PASSWORD=<current> node e2e/demo-flow.mjs` | Needs the demo flag on (the local compose stack). Locks the Kế toán persona for the run and unlocks it at the end, and switches the browser through every persona, so use a throwaway database, never the demo database. |
| End to end, catalogs | `cd web && BASE_URL=http://localhost:8080 HRM_ADMIN_PASSWORD=<current> node e2e/catalogs-flow.mjs` | Walks `/catalogs` against the real stack at 1280 and 390; adds a few catalog items through the API when they are missing and deactivates one, so use a throwaway database, never the demo database. |
| End to end, employees | `cd web && BASE_URL=http://localhost:8080 HRM_ADMIN_PASSWORD=<current> node e2e/employees-flow.mjs` | Walks `/employees` and a profile against the real stack at 1280 and 390 (paging, search, unit and position filters, no match, the filter dialog; the profile tabs and revealing a number, and the masked numbers as the Giám đốc persona when the demo personas are on); adds the 24 fictional Employees it walks through the API when no Employee of that name exists (with the example data they are already there) one more through the "Thêm nhân viên" form and two more through the Excel import (a workbook it writes with `e2e/xlsx.mjs`) on every run, so use a throwaway database, never the demo database. Needs the example org units (`HRM_EXAMPLE_DATA` on). |
| End to end, approval inbox | `cd web && BASE_URL=http://localhost:8080 HRM_ADMIN_PASSWORD=<current> node e2e/approvals-flow.mjs` | Needs the demo personas and the example data on (the local compose stack). Sends a profile update as each persona and approves level 1 through the API, then, as HR, opens the bell and a notification, walks `/approvals`, opens a request, returns one and approves one, delegates its approvals and ends the delegation early (at 1440 and 390), and, as the sender of the returned request, their bell, their sent requests and the request, which they edit and resend; as the Employee persona, cancels a waiting request and sends a new profile update from their own profile; as the PM persona, the example delegation; as the Line manager persona, the example inbox, rejects an example request and approves level 1 of the new one, which HR then approves at level 2, and the profile shows the change; last, as the Admin, edits and saves the Nghỉ phép flow on `/approval-flows` and puts the default back at the end; use a throwaway database, never the demo database. |
| End to end, projects | `cd web && BASE_URL=http://localhost:8080 HRM_ADMIN_PASSWORD=<current> node e2e/projects-flow.mjs` | Walks `/projects` and a project as the Admin at 1280 (search, the overload filter, closed projects; the detail with its overload alert and members; "Tạo dự án" with a taken code, "Sửa dự án", the shorten warning and closing the new project) and, with the demo personas on, as the PM persona ("Tôi quản lý", another PM's project read-only, and the list and detail at 390). Needs the example data (`HRM_EXAMPLE_DATA` on); adds five fictional projects and four allocations through the API when they are missing, dated relative to today, and one more project through the dialog on every run, so use a throwaway database, never the demo database. |
| API smoke | `bash .github/scripts/auth-smoke.sh` | curl walk through the auth API; prints a Markdown transcript. |

**CI** (`.github/workflows/ci.yml`) runs the backend and web tests on every PR and on `main`. On PRs it also builds the Docker image, starts the compose stack, runs the end-to-end flows in Chromium (`web/e2e/*-flow.mjs`: auth, org structure, accounts, roles, Demo as…, catalogs, employees, approval inbox, projects) and the API smoke, and posts the results on the PR (screenshots go to the `evidence` branch, which is never merged). Every flow runs on every PR, but the evidence comment shows the steps and screenshots only of the flows whose area the PR changed, plus any flow that failed; the others get one line. The mapping from paths to flows is `FLOWS` in `.github/scripts/e2e-evidence.py`: a new flow adds its row there.

**Prior art for new work:** `TokenServiceTest` (unit, Mockito + fixed `Clock`), `AuthApiIT` (API integration test), `web/src/components/ui/data-table.test.tsx` and `web/src/pages/login/login-page.test.tsx` (web).

## Skills dùng chung của dự án

Skill nằm **ngay trong repo**, nên agent nào clone về cũng có sẵn, không cần cài:
- `.claude/skills/` cho Claude Code
- `.agents/skills/` cho Codex và các agent đọc chuẩn Agent Skills

| Skill | Dùng khi | Nguồn |
|---|---|---|
| `java-springboot` | Viết hoặc review code backend Spring Boot | `github/awesome-copilot`, khóa phiên bản trong `skills-lock.json` |
| `frontend-design` | Craft and self-critique when building UI in `web/` (HRM design system wins on conflicts) | `anthropics/skills`, khóa phiên bản trong `skills-lock.json` |
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

Nguồn token chuẩn là design system HRM https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp; canvas chính "HRM design" https://claude.ai/artifact/961i1uVpSy8nTg6S5iSuxk. Kế hoạch và danh mục màn hình theo issue: `docs/design/DESIGN_PLAN.md`.
