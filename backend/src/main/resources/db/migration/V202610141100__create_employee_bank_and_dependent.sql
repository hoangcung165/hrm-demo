-- HRM-08: employee payout accounts and tax dependents.
-- Separate tenant-owned tables make employee scope and legal-entity boundaries explicit.
create table employee_bank_account (
    id uuid primary key,
    legal_entity_id uuid not null,
    employee_id uuid not null,
    bank_name varchar(150) not null,
    account_number varchar(50) not null,
    account_holder varchar(150) not null,
    is_default boolean not null default false,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_bank_employee foreign key (legal_entity_id, employee_id)
        references employee (legal_entity_id, id),
    constraint ck_bank_name_not_blank check (length(btrim(bank_name)) > 0),
    constraint ck_bank_number_not_blank check (length(btrim(account_number)) > 0),
    constraint ck_bank_holder_not_blank check (length(btrim(account_holder)) > 0)
);
create index ix_bank_employee on employee_bank_account (legal_entity_id, employee_id);
create unique index uq_bank_default_per_employee
    on employee_bank_account (legal_entity_id, employee_id) where is_default;

create table employee_dependent (
    id uuid primary key,
    legal_entity_id uuid not null,
    employee_id uuid not null,
    full_name varchar(150) not null,
    relationship varchar(80) not null,
    date_of_birth date,
    effective_from date not null,
    effective_to date,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_dependent_employee foreign key (legal_entity_id, employee_id)
        references employee (legal_entity_id, id),
    constraint ck_dependent_name_not_blank check (length(btrim(full_name)) > 0),
    constraint ck_dependent_relationship_not_blank check (length(btrim(relationship)) > 0),
    constraint ck_dependent_dates check (effective_to is null or effective_to >= effective_from)
);
create index ix_dependent_employee on employee_dependent (legal_entity_id, employee_id);
