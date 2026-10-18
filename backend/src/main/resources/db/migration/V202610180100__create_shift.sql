-- Ca làm việc: a named working pattern (start, end, optional break, tolerances, rounding). Never deleted: a shift
-- nobody should use any more is deactivated. An end time at or before the start means the shift crosses midnight and
-- belongs to the day it starts.
create table shift (
    id                     uuid         primary key,
    legal_entity_id        uuid         not null,
    code                   varchar(20)  not null,
    name                   varchar(100) not null,
    start_time             time         not null,
    end_time               time         not null,
    break_start            time,
    break_end              time,
    late_tolerance_minutes integer      not null,
    early_tolerance_minutes integer     not null,
    -- NONE, UP, DOWN or NEAREST; the step is 5, 10, 15 or 30 minutes and empty for NONE.
    rounding_mode          varchar(10)  not null,
    rounding_minutes       integer,
    active                 boolean      not null,
    created_at             timestamp with time zone not null,
    updated_at             timestamp with time zone not null,
    constraint fk_shift_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint uq_shift_code unique (legal_entity_id, code),
    constraint ck_shift_times check (start_time <> end_time),
    constraint ck_shift_break check ((break_start is null) = (break_end is null)),
    constraint ck_shift_tolerance check (late_tolerance_minutes between 0 and 120
        and early_tolerance_minutes between 0 and 120),
    constraint ck_shift_rounding check (rounding_mode in ('NONE', 'UP', 'DOWN', 'NEAREST')
        and ((rounding_mode = 'NONE' and rounding_minutes is null)
            or (rounding_mode <> 'NONE' and rounding_minutes in (5, 10, 15, 30))))
);
