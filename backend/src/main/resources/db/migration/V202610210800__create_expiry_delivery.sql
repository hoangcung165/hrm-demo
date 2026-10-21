-- One bell and one email attempt per recipient and configured warning milestone. A source can change its
-- expiry date, so the date is part of the key. The delivery row and bell line are written together.
alter table notification add column target_path varchar(300);

create table expiry_delivery (
    id uuid primary key,
    legal_entity_id uuid not null references legal_entity (id),
    document_type varchar(30) not null,
    source_id uuid not null,
    employee_id uuid not null references employee (id) on delete cascade,
    expires_on date not null,
    advance_days integer not null,
    recipient_id uuid not null references employee (id) on delete cascade,
    target_path varchar(300) not null,
    created_at timestamp with time zone not null,
    mail_sent_at timestamp with time zone,
    constraint uq_expiry_delivery unique
        (legal_entity_id, document_type, source_id, expires_on, advance_days, recipient_id),
    constraint ck_expiry_delivery_days check (advance_days between 0 and 365)
);
create index ix_expiry_delivery_pending on expiry_delivery (created_at, id) where mail_sent_at is null;
