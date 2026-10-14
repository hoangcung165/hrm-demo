-- HRM-08/BE-2: insurance metadata, expat document metadata and nationality filtering.
-- The social insurance number already lives on employee. Insured salary belongs to Salary Profile (ADR 0004).
alter table employee add column nationality varchar(2);
alter table employee add constraint ck_employee_nationality
    check (nationality is null or nationality ~ '^[A-Z]{2}$');
create index ix_employee_nationality on employee (legal_entity_id, nationality);

create table employee_insurance (
    id uuid primary key,
    legal_entity_id uuid not null,
    employee_id uuid not null,
    participation_date date,
    health_registration_place varchar(200),
    health_insurance_number varchar(40),
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_insurance_employee foreign key (legal_entity_id, employee_id)
        references employee (legal_entity_id, id),
    constraint uq_insurance_employee unique (legal_entity_id, employee_id)
);

create table employee_expat_document (
    id uuid primary key,
    legal_entity_id uuid not null,
    employee_id uuid not null,
    document_type varchar(20) not null,
    document_number varchar(40) not null,
    issuing_country varchar(2) not null,
    issued_at date,
    expires_at date not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_expat_document_employee foreign key (legal_entity_id, employee_id)
        references employee (legal_entity_id, id),
    constraint ck_expat_document_type check (document_type in ('PASSPORT', 'VISA', 'WORK_PERMIT')),
    constraint ck_expat_document_country check (issuing_country ~ '^[A-Z]{2}$'),
    constraint ck_expat_document_dates check (issued_at is null or expires_at >= issued_at)
);
create index ix_expat_document_employee on employee_expat_document (legal_entity_id, employee_id);
create index ix_expat_document_expiry on employee_expat_document (legal_entity_id, expires_at);
