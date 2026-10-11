-- Phân bổ (HRM-15): an Employee gives a percent of their working time to a Dự án from one day to another, both
-- included, with a Vai trò dự án. See docs/contexts/projects/CONTEXT.md. The rules (inside the project's dates, one
-- allocation per person and day in a project, delete only before it starts) are checked in AllocationService; the
-- Tải phân bổ across projects is computed by AllocationCalculator, never stored.
create table project_allocation (
    id              uuid        primary key,
    legal_entity_id uuid        not null,
    project_id      uuid        not null,
    employee_id     uuid        not null,
    -- An item of the PROJECT_ROLE catalog; the service checks the catalog.
    project_role_id uuid        not null,
    percent         integer     not null,
    start_date      date        not null,
    end_date        date        not null,
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null,
    constraint fk_project_allocation_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint fk_project_allocation_project foreign key (legal_entity_id, project_id)
        references project (legal_entity_id, id) on delete cascade,
    constraint fk_project_allocation_employee foreign key (legal_entity_id, employee_id)
        references employee (legal_entity_id, id),
    constraint fk_project_allocation_project_role foreign key (project_role_id) references catalog_item (id),
    constraint ck_project_allocation_percent check (percent between 1 and 100),
    constraint ck_project_allocation_dates check (end_date >= start_date)
);

create index ix_project_allocation_project on project_allocation (project_id);
create index ix_project_allocation_employee on project_allocation (legal_entity_id, employee_id, end_date);
