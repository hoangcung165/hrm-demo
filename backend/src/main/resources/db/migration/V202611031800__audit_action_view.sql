-- HRM-39: reading some records is itself audited (the photo of a mobile Lần quẹt). Such a record has the action VIEW,
-- no values before, and the values that say what was read after.
alter table audit_log drop constraint ck_audit_log_action;
alter table audit_log add constraint ck_audit_log_action check (action in ('CREATE', 'UPDATE', 'DELETE', 'VIEW'));
