-- Audit log (HRM-13): who changed what and when, with the values before and after. Append-only: rows are only ever
-- inserted. The trigger below refuses UPDATE and DELETE even for a direct SQL session. Registered entity types live in
-- code (AuditRegistrations), not in this table.
create table audit_log (
    id              uuid primary key,
    legal_entity_id uuid        not null,
    occurred_at     timestamp with time zone not null,
    -- The Account that made the change; plain id on purpose, so the record survives that Account being deleted.
    actor_id        uuid,
    -- The Account's name when it happened.
    actor_name      varchar(200),
    action          varchar(10) not null,
    entity_type     varchar(60) not null,
    entity_id       uuid        not null,
    summary         varchar(300) not null,
    -- Only the audited fields, as {"field": value}. UPDATE keeps the changed fields only; CREATE has no before and
    -- DELETE has no after. Masked fields hold "***", never the value.
    before_values   jsonb,
    after_values    jsonb,
    constraint fk_audit_log_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint ck_audit_log_action check (action in ('CREATE', 'UPDATE', 'DELETE'))
);

create index ix_audit_log_occurred_at on audit_log (legal_entity_id, occurred_at desc);
create index ix_audit_log_entity on audit_log (legal_entity_id, entity_type, entity_id);
create index ix_audit_log_actor on audit_log (legal_entity_id, actor_id);

create function audit_log_append_only() returns trigger
    language plpgsql as
$$
begin
    raise exception 'audit_log is append-only (% refused)', tg_op;
end
$$;

create trigger trg_audit_log_append_only
    before update or delete on audit_log
    for each row execute function audit_log_append_only();
