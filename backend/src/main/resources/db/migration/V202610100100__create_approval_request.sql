-- Yêu cầu phê duyệt (HRM-12). One row per request of any type; the type's own data (the profile changes, the
-- leave days…) lives with that feature and points here. A request keeps a copy of the flow it was sent with
-- (approval_request_level, auto_approve_days, delegation_allowed), so a flow saved later does not change it.
-- The state machine is ApprovalEngine; these columns hold its state between actions.
create table approval_request (
    id                      uuid         primary key,
    legal_entity_id         uuid         not null,
    request_type            varchar(30)  not null,
    -- The Employee who sent it.
    sender_id               uuid         not null,
    -- The project of a timesheet; null for the other types.
    project_id              uuid,
    -- One line for lists and notifications, written by the feature: "Số điện thoại, địa chỉ".
    summary                 varchar(300) not null,
    status                  varchar(30)  not null,
    -- The level waiting (or that returned it), counted from 1; the last level reached once it ended.
    level                   integer      not null,
    auto_approve_days       integer,
    delegation_allowed      boolean      not null,
    -- Whether the waiting level went up past its own rule (Tự đẩy lên cấp trên).
    escalated               boolean      not null default false,
    level_reached_at        timestamp with time zone not null,
    -- Time the waiting level had already waited before a return: auto-approve pauses while returned.
    waited_seconds          bigint       not null default 0,
    -- When the waiting level approves itself; null when never or when not waiting. Kept for the job and the inbox.
    auto_approve_due_at     timestamp with time zone,
    created_at              timestamp with time zone not null,
    updated_at              timestamp with time zone not null,
    version                 bigint       not null default 0,
    constraint fk_approval_request_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint fk_approval_request_sender foreign key (sender_id) references employee (id),
    constraint ck_approval_request_status check (status in
        ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'RETURNED_FOR_INFO', 'CANCELLED')),
    constraint ck_approval_request_level check (level between 1 and 3)
);

create index ix_approval_request_sender on approval_request (legal_entity_id, sender_id, created_at desc);
create index ix_approval_request_due on approval_request (auto_approve_due_at) where status = 'PENDING';

-- The copy of the flow's levels, in order from 1.
create table approval_request_level (
    request_id uuid        not null,
    position   integer     not null,
    rule       varchar(30) not null,
    role       varchar(30),
    constraint pk_approval_request_level primary key (request_id, position),
    constraint fk_approval_request_level_request foreign key (request_id)
        references approval_request (id) on delete cascade
);

-- Who may approve the waiting level (delegates are read live and are not listed). Empty once it is not waiting.
create table approval_request_approver (
    request_id  uuid not null,
    employee_id uuid not null,
    constraint pk_approval_request_approver primary key (request_id, employee_id),
    constraint fk_approval_request_approver_request foreign key (request_id)
        references approval_request (id) on delete cascade
);

create index ix_approval_request_approver_employee on approval_request_approver (employee_id);

-- Nhật ký: one row per event of the request, in order. Also answers "requests I handled".
create table approval_request_log (
    id              uuid        primary key,
    legal_entity_id uuid        not null,
    request_id      uuid        not null,
    event           varchar(30) not null,
    level           integer     not null,
    -- The Employee who acted; null for the system.
    actor_id        uuid,
    -- The approver the actor stood in for under an Ủy quyền duyệt.
    on_behalf_of_id uuid,
    -- The note, or the reason of a reject or a return.
    comment         varchar(1000),
    -- For ESCALATED: SENDER_LINE_MANAGER, PARENT_UNIT_HEAD or HR_ROLE.
    escalated_to    varchar(30),
    at              timestamp with time zone not null,
    seq             integer     not null,
    constraint fk_approval_request_log_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint fk_approval_request_log_request foreign key (request_id) references approval_request (id)
        on delete cascade,
    constraint uq_approval_request_log_seq unique (request_id, seq)
);

create index ix_approval_request_log_actor on approval_request_log (actor_id, at desc) where actor_id is not null;
