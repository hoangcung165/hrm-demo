# Auditing a new kind of record

How a feature puts its changes in the **Audit log** (HRM-13). Term and rules: `docs/contexts/org/CONTEXT.md`, entry "Audit log". The log is append-only: no screen, API, repository method or SQL session edits or deletes a record.

The first audited kind is **Ngưỡng nguồn lực** (`RESOURCE_SETTING`, HRM-17). **HRM-10** registers the **Hồ sơ lương** and the employment contract (ADR 0004: every change of a Hồ sơ lương goes through a document and is audited), and **HRM-11** registers the changes of work history, probation and resignation. Later features do the same for attendance, allocations, approvals and payroll parameters.

## Steps

1. **Register the kind** in `backend/.../service/audit/AuditRegistrations.java`: a `public static final String` key in `UPPER_SNAKE_CASE` and an `AuditedType` bean with an English label and the audited fields in display order. Mark identity numbers, bank accounts, passwords and other secrets with `masked(...)`: the log stores `***` and the screen shows "Đã ẩn". Decide with the issue which amounts stay readable: Admin and Giám đốc read the log (`AUDIT_VIEW`).

   ```java
   public static final String SALARY_PROFILE = "SALARY_PROFILE";

   @Bean
   AuditedType salaryProfileAudit() {
       return new AuditedType(SALARY_PROFILE, "Salary profile",
               List.of(field("baseSalary"), field("insuranceSalary"), masked("bankAccountNumber")));
   }
   ```

2. **Record the change** where it happens, in the service method that saves it (inside its transaction): `AuditRecorder.record(caller, KEY, id, action, summary, before, after)`, or `recordCompanyWide(...)` for a record that exists once per Pháp nhân. Pass the values as maps of field name to value; the recorder keeps only the registered fields, drops the unchanged ones on an UPDATE, masks the masked ones, and writes nothing when nothing changed. `before` is null on a CREATE, `after` on a DELETE. The summary is one short English sentence ("Salary profile changed").

3. **Name it on the screen**: add `audit.entityType.<KEY>` and `audit.field.<KEY>.<field>` to `web/src/i18n/locales/vi.json` and `en.json`. Without them the screen falls back to the English label and the field names.

4. **Test it**: a unit test that the service calls the recorder with the right before and after values (see `ResourceSettingsServiceTest`), and, where the change has a UI, a step in its end-to-end flow or in `web/e2e/audit-flow.mjs` that finds the record.

No migration is needed: `audit_log` stores every kind, and the filters of `/audit-log` list the registered kinds and the people found in the log.
