-- Đơn vị tổ chức (Organization unit): one node of the company's org tree (branch, department, team).
-- See docs/contexts/org/CONTEXT.md. The company itself is not a row: it is the Legal entity, and a unit
-- with parent_id null sits directly under it.
create table org_unit (
    id               uuid         primary key,
    legal_entity_id  uuid         not null,
    parent_id        uuid,
    code             varchar(10)  not null,
    name             varchar(150) not null,
    type             varchar(20)  not null,
    -- Trưởng đơn vị (Unit head). The employee table arrives with HRM-06, which adds the foreign key.
    head_employee_id uuid,
    active           boolean      not null default true,
    -- Order among siblings; ties are broken by name.
    sort_order       integer      not null default 0,
    created_at       timestamp with time zone not null,
    updated_at       timestamp with time zone not null,
    constraint fk_org_unit_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    -- Target of the parent foreign key below.
    constraint uq_org_unit_legal_entity_id unique (legal_entity_id, id),
    -- The parent is a unit of the same Legal entity; a unit with child units cannot be deleted.
    constraint fk_org_unit_parent foreign key (legal_entity_id, parent_id) references org_unit (legal_entity_id, id),
    constraint ck_org_unit_not_own_parent check (parent_id <> id),
    -- Codes are stored in upper case, so the unique index below is case-insensitive in effect.
    constraint ck_org_unit_code check (code ~ '^[A-Z0-9-]{2,10}$'),
    constraint ck_org_unit_type check (type in ('BRANCH', 'DEPARTMENT', 'TEAM'))
);

-- Also serves lookups by legal_entity_id alone (leading column), like uq_org_unit_legal_entity_id.
create unique index uq_org_unit_code on org_unit (legal_entity_id, code);
create index ix_org_unit_parent on org_unit (parent_id);
