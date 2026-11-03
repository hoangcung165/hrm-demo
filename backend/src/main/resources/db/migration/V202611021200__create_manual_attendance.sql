-- Công thủ công (HRM-24): the result of a day entered by the timekeeper for people who have no machine to punch on.
-- One row per Employee and day; a day with one is computed from it alone, never added to the day's punches.
create table manual_attendance (
    id              uuid primary key,
    legal_entity_id uuid not null,
    employee_id     uuid not null,
    work_date       date not null,
    kind            varchar(10) not null,
    -- In and Out as minutes after midnight (0-1439), free of any time zone conversion.
    minute_in       integer,
    minute_out      integer,
    note            varchar(500),
    entered_by      uuid not null,
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null,
    constraint fk_manual_attendance_employee foreign key (legal_entity_id, employee_id)
        references employee (legal_entity_id, id),
    constraint uq_manual_attendance_day unique (employee_id, work_date),
    constraint ck_manual_attendance_kind check (kind in ('FULL', 'HALF', 'ABSENT', 'TIMES')),
    constraint ck_manual_attendance_times check (
        (kind = 'TIMES' and minute_in between 0 and 1439 and minute_out between 0 and 1439
            and minute_in <> minute_out)
        or (kind <> 'TIMES' and minute_in is null and minute_out is null))
);

create index ix_manual_attendance_day on manual_attendance (work_date);
