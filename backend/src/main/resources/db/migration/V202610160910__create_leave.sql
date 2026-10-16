-- Nghỉ phép (HRM-18): the company's Lịch làm việc, the Loại nghỉ with their Chính sách phép (versions with an
-- effective date), and the Đơn nghỉ sent through the Luồng phê duyệt "Nghỉ phép".

-- Lịch làm việc of the company: what each weekday is. No row means the default in code (WorkWeek.DEFAULT: Monday to
-- Friday, whole days), so the table starts empty. One row per Legal entity.
create table work_schedule (
    id              uuid        primary key,
    legal_entity_id uuid        not null,
    monday          varchar(10) not null,
    tuesday         varchar(10) not null,
    wednesday       varchar(10) not null,
    thursday        varchar(10) not null,
    friday          varchar(10) not null,
    saturday        varchar(10) not null,
    sunday          varchar(10) not null,
    updated_at      timestamp with time zone not null,
    -- The Account that saved it; kept when that Account is deleted.
    updated_by      uuid,
    constraint fk_work_schedule_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint uq_work_schedule unique (legal_entity_id),
    constraint ck_work_schedule_days check (
        monday in ('FULL', 'MORNING', 'OFF') and tuesday in ('FULL', 'MORNING', 'OFF')
        and wednesday in ('FULL', 'MORNING', 'OFF') and thursday in ('FULL', 'MORNING', 'OFF')
        and friday in ('FULL', 'MORNING', 'OFF') and saturday in ('FULL', 'MORNING', 'OFF')
        and sunday in ('FULL', 'MORNING', 'OFF'))
);

-- Loại nghỉ: a kind of leave with rules of its own (a settings page, not a catalog). Never deleted once used; a type
-- the company no longer offers is made inactive.
create table leave_type (
    id              uuid         primary key,
    legal_entity_id uuid         not null,
    code            varchar(20)  not null,
    name            varchar(100) not null,
    sort_order      integer      not null,
    active          boolean      not null,
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null,
    constraint fk_leave_type_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint uq_leave_type_code unique (legal_entity_id, code)
);

-- Chính sách phép of a Loại nghỉ: one version per effective date, in force until the next one. Saving the policy adds
-- a version (or replaces the one of the same date); the past stays as it was, so balances of earlier months keep
-- their rules.
create table leave_policy (
    id                   uuid         primary key,
    legal_entity_id      uuid         not null,
    leave_type_id        uuid         not null,
    effective_from       date         not null,
    -- Who pays: COMPANY (counts in Công thực tế), SOCIAL_INSURANCE (BHXH), UNPAID.
    pay                  varchar(20)  not null,
    half_day_allowed     boolean      not null,
    attachment_required  boolean      not null,
    -- A limited type has a Số dư phép: a request may not take more than it allows.
    limited              boolean      not null,
    -- Định mức phép năm before seniority; limited types only.
    entitlement_days     numeric(4,1),
    -- One more day per this many full years of service; null for none.
    seniority_step_years integer,
    -- MONTHLY (1/12 at the start of each month) or YEARLY (the whole year on 1 January); limited types only.
    accrual              varchar(10),
    -- A hire on or before this day of the month earns that month.
    cut_off_day          integer      not null,
    -- Ứng trước phép up to the whole year's entitlement.
    advance_allowed      boolean      not null,
    max_days_per_request numeric(5,1),
    -- Phép tồn: kept into the next year up to this many days, until the day (MM-DD) of the next year. Applied by the
    -- year-end job of HRM-19.
    carry_over_max_days  numeric(4,1),
    carry_over_expiry    varchar(5),
    created_at           timestamp with time zone not null,
    created_by           uuid,
    constraint fk_leave_policy_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint fk_leave_policy_type foreign key (leave_type_id) references leave_type (id),
    constraint uq_leave_policy unique (leave_type_id, effective_from),
    constraint ck_leave_policy_pay check (pay in ('COMPANY', 'SOCIAL_INSURANCE', 'UNPAID')),
    constraint ck_leave_policy_accrual check (accrual is null or accrual in ('MONTHLY', 'YEARLY')),
    constraint ck_leave_policy_limited check (not limited or (entitlement_days is not null and accrual is not null)),
    constraint ck_leave_policy_cut_off check (cut_off_day between 1 and 31)
);

-- Đơn nghỉ: sent as a Yêu cầu phê duyệt of type LEAVE (same id). Its status follows the request, except that an
-- approved one can still be cancelled by its sender before it starts.
create table leave_request (
    id              uuid         primary key,
    legal_entity_id uuid         not null,
    employee_id     uuid         not null,
    leave_type_id   uuid         not null,
    start_date      date         not null,
    start_part      varchar(10)  not null,
    end_date        date         not null,
    end_part        varchar(10)  not null,
    -- What the request counts: working days of the Lịch làm việc without holidays, halves as 0.5.
    days            numeric(5,1) not null,
    reason          varchar(500),
    status          varchar(10)  not null,
    cancelled_at    timestamp with time zone,
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null,
    constraint fk_leave_request_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint fk_leave_request_approval foreign key (id) references approval_request (id) on delete cascade,
    constraint fk_leave_request_employee foreign key (employee_id) references employee (id),
    constraint fk_leave_request_type foreign key (leave_type_id) references leave_type (id),
    constraint ck_leave_request_parts check (start_part in ('FULL', 'MORNING', 'AFTERNOON')
        and end_part in ('FULL', 'MORNING', 'AFTERNOON')),
    constraint ck_leave_request_status check (status in ('PENDING', 'RETURNED', 'APPROVED', 'REJECTED', 'CANCELLED')),
    constraint ck_leave_request_dates check (end_date >= start_date)
);

create index ix_leave_request_employee on leave_request (employee_id, status);
create index ix_leave_request_dates on leave_request (start_date, end_date);

-- Every day of a request as it was counted when sent: a later change of the Lịch làm việc or the holidays does not
-- change what a request took.
create table leave_request_day (
    request_id uuid         not null,
    day        date         not null,
    kind       varchar(10)  not null,
    morning    boolean      not null,
    afternoon  boolean      not null,
    value      numeric(2,1) not null,
    constraint pk_leave_request_day primary key (request_id, day),
    constraint fk_leave_request_day_request foreign key (request_id) references leave_request (id) on delete cascade,
    constraint ck_leave_request_day_kind check (kind in ('WORKING', 'DAY_OFF', 'HOLIDAY'))
);

-- The people the sender copied (CC). They may open the request; they do not approve.
create table leave_request_cc (
    request_id  uuid not null,
    employee_id uuid not null,
    constraint pk_leave_request_cc primary key (request_id, employee_id),
    constraint fk_leave_request_cc_request foreign key (request_id) references leave_request (id) on delete cascade,
    constraint fk_leave_request_cc_employee foreign key (employee_id) references employee (id)
);

-- A file for a request (a medical certificate…). Uploaded first by the Employee, then attached when the request is
-- sent; an upload never attached stays with its Employee only.
create table leave_attachment (
    id               uuid         primary key,
    legal_entity_id  uuid         not null,
    employee_id      uuid         not null,
    leave_request_id uuid,
    file_name        varchar(180) not null,
    content_type     varchar(100) not null,
    size_bytes       integer      not null,
    sha256           varchar(64)  not null,
    content          bytea        not null,
    created_at       timestamp with time zone not null,
    constraint fk_leave_attachment_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint fk_leave_attachment_employee foreign key (employee_id) references employee (id),
    constraint fk_leave_attachment_request foreign key (leave_request_id) references leave_request (id)
        on delete cascade
);

create index ix_leave_attachment_request on leave_attachment (leave_request_id);

-- The default Loại nghỉ of every company, as of 2000 so they govern every year until changed:
-- Phép năm (Bộ luật Lao động Điều 113–114: 12 days, +1 per 5 years, accrued monthly, advance allowed, Phép tồn up to
-- 5 days until 31/03), Nghỉ ốm and Thai sản (paid by BHXH, with a certificate), Việc riêng có lương (Điều 115: at most
-- 3 days at once), Không lương.
insert into leave_type (id, legal_entity_id, code, name, sort_order, active, created_at, updated_at)
select gen_random_uuid(), le.id, t.code, t.name, t.sort_order, true, now(), now()
from legal_entity le
cross join (values
    ('PN', 'Phép năm', 1),
    ('OM', 'Nghỉ ốm', 2),
    ('TS', 'Thai sản', 3),
    ('VR', 'Việc riêng có lương', 4),
    ('KL', 'Không lương', 5)
) as t(code, name, sort_order);

insert into leave_policy (id, legal_entity_id, leave_type_id, effective_from, pay, half_day_allowed,
    attachment_required, limited, entitlement_days, seniority_step_years, accrual, cut_off_day, advance_allowed,
    max_days_per_request, carry_over_max_days, carry_over_expiry, created_at, created_by)
select gen_random_uuid(), lt.legal_entity_id, lt.id, date '2000-01-01', p.pay, p.half_day_allowed,
    p.attachment_required, p.limited, p.entitlement_days, p.seniority_step_years, p.accrual, 15, p.advance_allowed,
    p.max_days_per_request, p.carry_over_max_days, p.carry_over_expiry, now(), null
from leave_type lt
join (values
    ('PN', 'COMPANY', true, false, true, 12.0, 5, 'MONTHLY', true, null::numeric, 5.0, '03-31'),
    ('OM', 'SOCIAL_INSURANCE', true, true, false, null, null, null, false, null, null, null),
    ('TS', 'SOCIAL_INSURANCE', false, true, false, null, null, null, false, null, null, null),
    ('VR', 'COMPANY', false, false, false, null, null, null, false, 3.0, null, null),
    ('KL', 'UNPAID', true, false, false, null, null, null, false, null, null, null)
) as p(code, pay, half_day_allowed, attachment_required, limited, entitlement_days, seniority_step_years, accrual,
       advance_allowed, max_days_per_request, carry_over_max_days, carry_over_expiry)
    on p.code = lt.code;
