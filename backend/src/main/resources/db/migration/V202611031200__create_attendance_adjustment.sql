-- Đơn bổ sung công (HRM-24): an Employee asks for the time of a punch they forgot. The id is the id of its
-- Yêu cầu phê duyệt (ATTENDANCE_ADJUSTMENT). It only fills what is missing on that day; once approved, the Bộ xử lý
-- chấm công uses its times for the missing side(s). The times are instants, already placed on the right calendar day
-- for a shift that crosses midnight.
create table attendance_adjustment (
    id              uuid primary key,
    legal_entity_id uuid not null,
    employee_id     uuid not null,
    work_date       date not null,
    time_in         timestamp with time zone,
    time_out        timestamp with time zone,
    reason          varchar(500) not null,
    status          varchar(20) not null,
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null,
    constraint fk_attendance_adjustment_employee foreign key (legal_entity_id, employee_id)
        references employee (legal_entity_id, id),
    constraint fk_attendance_adjustment_request foreign key (id) references approval_request (id) on delete cascade,
    constraint ck_attendance_adjustment_time check (time_in is not null or time_out is not null),
    constraint ck_attendance_adjustment_status check (status in ('PENDING', 'RETURNED', 'APPROVED', 'REJECTED',
        'CANCELLED'))
);

-- One open request per Employee and day, also when two are sent at once.
create unique index uq_attendance_adjustment_open on attendance_adjustment (employee_id, work_date)
    where status in ('PENDING', 'RETURNED');
create index ix_attendance_adjustment_day on attendance_adjustment (work_date);
