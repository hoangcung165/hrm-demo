-- Phân ca: one Ca làm việc per Employee per day. The unique key is what keeps an Employee from having two shifts on a
-- day, also under concurrent calls. A shift that crosses midnight is stored on the day it starts.
create table shift_assignment (
    id              uuid primary key,
    legal_entity_id uuid not null,
    employee_id     uuid not null,
    work_date       date not null,
    shift_id        uuid not null,
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null,
    constraint fk_shift_assignment_employee foreign key (legal_entity_id, employee_id)
        references employee (legal_entity_id, id),
    constraint fk_shift_assignment_shift foreign key (shift_id) references shift (id),
    constraint uq_shift_assignment_day unique (employee_id, work_date)
);

-- The calendar reads a date range for many Employees, and "who works this shift" by day.
create index ix_shift_assignment_date on shift_assignment (work_date, shift_id);

-- Ca mặc định of an Đơn vị tổ chức: fills the working days of its Employees that have no Phân ca of their own.
alter table org_unit add column default_shift_id uuid;
alter table org_unit add constraint fk_org_unit_default_shift foreign key (default_shift_id) references shift (id);
