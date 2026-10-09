-- Ủy quyền duyệt (HRM-12): an approver hands their approvals of some request types to another Employee for a
-- range of days, both included. Read live by the approval engine, so it also covers requests already waiting.
-- Ending early sets ended_at; cancelling one that has not started deletes the row (it never took effect).
create table approval_delegation (
    id              uuid        primary key,
    legal_entity_id uuid        not null,
    delegator_id    uuid        not null,
    delegate_id     uuid        not null,
    start_date      date        not null,
    end_date        date        not null,
    created_at      timestamp with time zone not null,
    ended_at        timestamp with time zone,
    constraint fk_approval_delegation_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint fk_approval_delegation_delegator foreign key (delegator_id) references employee (id),
    constraint fk_approval_delegation_delegate foreign key (delegate_id) references employee (id),
    constraint ck_approval_delegation_dates check (end_date >= start_date),
    constraint ck_approval_delegation_self check (delegator_id <> delegate_id)
);

create index ix_approval_delegation_delegator on approval_delegation (delegator_id, end_date);
create index ix_approval_delegation_delegate on approval_delegation (delegate_id, end_date);

-- The request types a delegation covers; never PAYROLL (checked in the service).
create table approval_delegation_type (
    delegation_id uuid        not null,
    request_type  varchar(30) not null,
    constraint pk_approval_delegation_type primary key (delegation_id, request_type),
    constraint fk_approval_delegation_type_delegation foreign key (delegation_id)
        references approval_delegation (id) on delete cascade
);
