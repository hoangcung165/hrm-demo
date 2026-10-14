-- HRM-09: qualifications belong to the Employee and the single Legal entity.
create table employee_skill (
    id uuid primary key,
    legal_entity_id uuid not null,
    employee_id uuid not null,
    skill_id uuid not null,
    level integer not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_employee_skill_employee foreign key (legal_entity_id, employee_id)
        references employee (legal_entity_id, id),
    constraint fk_employee_skill_catalog foreign key (skill_id) references catalog_item (id),
    constraint uq_employee_skill unique (legal_entity_id, employee_id, skill_id),
    constraint ck_employee_skill_level check (level between 1 and 5)
);
create index ix_employee_skill_lookup on employee_skill (legal_entity_id, skill_id, level, employee_id);

-- The attachment FK checks the owner as well as the file ID. Deleting the file clears only attachment_id.
alter table employee_attachment
    add constraint uq_employee_attachment_owner_id unique (legal_entity_id, employee_id, id);

create table employee_certificate (
    id uuid primary key,
    legal_entity_id uuid not null,
    employee_id uuid not null,
    name varchar(150) not null,
    issuer varchar(150),
    issued_at date,
    expires_at date,
    attachment_id uuid,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_employee_certificate_employee foreign key (legal_entity_id, employee_id)
        references employee (legal_entity_id, id),
    constraint fk_employee_certificate_attachment foreign key (legal_entity_id, employee_id, attachment_id)
        references employee_attachment (legal_entity_id, employee_id, id) on delete set null (attachment_id),
    constraint ck_employee_certificate_name check (length(btrim(name)) > 0),
    constraint ck_employee_certificate_dates check (expires_at is null or issued_at is null or expires_at >= issued_at)
);
create index ix_employee_certificate_employee on employee_certificate (legal_entity_id, employee_id, expires_at);
create index ix_employee_certificate_expiry on employee_certificate (legal_entity_id, expires_at)
    where expires_at is not null;
