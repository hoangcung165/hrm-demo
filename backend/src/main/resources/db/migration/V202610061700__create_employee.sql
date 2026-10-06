-- Nhân viên (Employee): a person who works for the company, on probation, official or inactive (left).
-- See docs/contexts/people/CONTEXT.md. Leaving the company never deletes the row: the status becomes INACTIVE.
create table employee (
    id                             uuid         primary key,
    legal_entity_id                uuid         not null,
    -- Mã nhân viên: issued by the server (NV00001), never edited or reused.
    code                           varchar(20)  not null,
    full_name                      varchar(150) not null,
    -- Full name and code as SearchText: what the list search reads.
    search_text                    varchar(200) not null,
    -- Personal
    date_of_birth                  date         not null,
    gender                         varchar(10)  not null,
    personal_email                 varchar(254),
    phone                          varchar(10),
    address                        varchar(500),
    emergency_contact_name         varchar(150),
    emergency_contact_relationship varchar(50),
    emergency_contact_phone        varchar(10),
    -- Trường nhạy cảm (sensitive fields): masked for callers without EMPLOYEE_SENSITIVE_VIEW.
    id_number                      varchar(12)  not null,
    id_issue_date                  date,
    id_issue_place                 varchar(150),
    tax_code                       varchar(12),
    social_insurance_number        varchar(12),
    -- Job. org_unit_id null: directly under the company. manager_id null: follows the unit head.
    org_unit_id                    uuid,
    position_id                    uuid         not null,
    manager_id                     uuid,
    hire_date                      date         not null,
    status                         varchar(20)  not null,
    created_at                     timestamp with time zone not null,
    updated_at                     timestamp with time zone not null,
    constraint fk_employee_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    -- Target of the foreign keys from employee (manager), org_unit (head) and account.
    constraint uq_employee_legal_entity_id unique (legal_entity_id, id),
    constraint fk_employee_org_unit foreign key (legal_entity_id, org_unit_id)
        references org_unit (legal_entity_id, id),
    -- The service checks that the item belongs to the POSITION catalog.
    constraint fk_employee_position foreign key (position_id) references catalog_item (id),
    constraint fk_employee_manager foreign key (legal_entity_id, manager_id) references employee (legal_entity_id, id),
    constraint ck_employee_not_own_manager check (manager_id <> id),
    constraint ck_employee_code check (code ~ '^NV[0-9]{5,}$'),
    constraint ck_employee_gender check (gender in ('MALE', 'FEMALE')),
    constraint ck_employee_status check (status in ('PROBATION', 'OFFICIAL', 'INACTIVE')),
    constraint ck_employee_phone check (phone ~ '^0[0-9]{9}$'),
    constraint ck_employee_emergency_contact_phone check (emergency_contact_phone ~ '^0[0-9]{9}$'),
    constraint ck_employee_id_number check (id_number ~ '^[0-9]{12}$'),
    constraint ck_employee_id_issue_date check (id_issue_date >= date_of_birth),
    constraint ck_employee_tax_code check (tax_code ~ '^([0-9]{10}|[0-9]{12})$'),
    constraint ck_employee_social_insurance_number check (social_insurance_number ~ '^([0-9]{10}|[0-9]{12})$')
);

create unique index uq_employee_code on employee (legal_entity_id, code);
create unique index uq_employee_id_number on employee (legal_entity_id, id_number);
create unique index uq_employee_tax_code on employee (legal_entity_id, tax_code) where tax_code is not null;
create unique index uq_employee_social_insurance_number on employee (legal_entity_id, social_insurance_number)
    where social_insurance_number is not null;
create index ix_employee_org_unit on employee (legal_entity_id, org_unit_id);
create index ix_employee_position on employee (legal_entity_id, position_id);
create index ix_employee_status on employee (legal_entity_id, status);
create index ix_employee_manager on employee (manager_id);

-- The foreign keys that waited for this table. No Employee existed before, so no value can be valid yet;
-- the APIs never accepted one, and clearing stray values keeps the constraints valid on every database.
update org_unit set head_employee_id = null where head_employee_id is not null;
alter table org_unit add constraint fk_org_unit_head_employee foreign key (legal_entity_id, head_employee_id)
    references employee (legal_entity_id, id);

update account set employee_id = null where employee_id is not null;
alter table account add constraint fk_account_employee foreign key (legal_entity_id, employee_id)
    references employee (legal_entity_id, id);
