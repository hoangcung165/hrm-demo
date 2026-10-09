-- Luồng phê duyệt (HRM-12): the flow of each request type has a default in code (ApprovalFlowDefaults). A company's
-- own flow for a type is stored here; no row means "as the default", so the table starts empty and a request type
-- added by a later release reaches every company with its default. Saving a flow equal to the default removes the
-- row. The rules of a flow (1 to 3 levels, PM only for timesheets, nothing automatic for payroll) are checked in
-- ApprovalFlow; the checks below only keep the rows well formed.
create table approval_flow_setting (
    id                 uuid        primary key,
    legal_entity_id    uuid        not null,
    request_type       varchar(30) not null,
    -- Calendar days after which a waiting level approves itself; null: never.
    auto_approve_days  integer,
    delegation_allowed boolean     not null,
    updated_at         timestamp with time zone not null,
    -- The Account that saved it; kept when that Account is deleted.
    updated_by         uuid,
    constraint fk_approval_flow_setting_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint uq_approval_flow_setting unique (legal_entity_id, request_type),
    constraint ck_approval_flow_setting_days check (auto_approve_days is null or auto_approve_days between 1 and 30)
);

-- The levels of a stored flow, in order from 1.
create table approval_flow_setting_level (
    setting_id uuid        not null,
    position   integer     not null,
    rule       varchar(30) not null,
    -- The role of a ROLE level; null for the other rules.
    role       varchar(30),
    constraint pk_approval_flow_setting_level primary key (setting_id, position),
    constraint fk_approval_flow_setting_level_setting foreign key (setting_id)
        references approval_flow_setting (id) on delete cascade,
    constraint ck_approval_flow_setting_level_position check (position between 1 and 3),
    constraint ck_approval_flow_setting_level_role check ((rule = 'ROLE') = (role is not null))
);
