-- HRM-14: warning windows shared by the upcoming list and the daily delivery job.
create table expiry_policy (
    id uuid primary key,
    legal_entity_id uuid not null references legal_entity(id),
    document_type varchar(20) not null,
    advance_days integer not null check (advance_days between 0 and 365),
    updated_by uuid,
    updated_at timestamptz not null,
    unique (legal_entity_id, document_type),
    check (document_type in ('CONTRACT', 'PROBATION', 'VISA', 'WORK_PERMIT', 'CERTIFICATE'))
);
insert into expiry_policy (id, legal_entity_id, document_type, advance_days, updated_at)
select gen_random_uuid(), e.id, p.document_type, p.days, now()
from legal_entity e cross join (values ('CONTRACT', 30), ('PROBATION', 14), ('VISA', 60),
    ('WORK_PERMIT', 60), ('CERTIFICATE', 30)) p(document_type, days);
