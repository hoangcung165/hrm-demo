-- Dự án (HRM-15): a block of work with dates, one PM and a labour budget, to which Employees are allocated (BE-3).
-- See docs/contexts/projects/CONTEXT.md. The rules (who may edit, the PM, the unit) are checked in ProjectService.
create table project (
    id              uuid         primary key,
    legal_entity_id uuid         not null,
    -- Mã dự án: typed by the user, unique in the company whatever the case, never changed after creation.
    code            varchar(20)  not null,
    name            varchar(150) not null,
    -- Free text; null for an internal project.
    client          varchar(150),
    -- Code, name and client as SearchText: what the list search reads.
    search_text     varchar(330) not null,
    pm_employee_id  uuid         not null,
    -- Phòng ban phụ trách (owning unit).
    org_unit_id     uuid         not null,
    start_date      date         not null,
    end_date        date         not null,
    status          varchar(20)  not null,
    -- Ngân sách nhân sự in VND; null when not set.
    labor_budget    bigint,
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null,
    constraint fk_project_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    -- Target of the foreign keys from the allocations (BE-3).
    constraint uq_project_legal_entity_id unique (legal_entity_id, id),
    constraint fk_project_pm foreign key (legal_entity_id, pm_employee_id) references employee (legal_entity_id, id),
    constraint fk_project_org_unit foreign key (legal_entity_id, org_unit_id) references org_unit (legal_entity_id, id),
    constraint ck_project_code check (code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$'),
    constraint ck_project_dates check (end_date >= start_date),
    constraint ck_project_status check (status in ('PLANNED', 'ACTIVE', 'ON_HOLD', 'CLOSED')),
    constraint ck_project_labor_budget check (labor_budget is null or labor_budget >= 0)
);

create unique index uq_project_code on project (legal_entity_id, lower(code));
create index ix_project_pm on project (legal_entity_id, pm_employee_id);
