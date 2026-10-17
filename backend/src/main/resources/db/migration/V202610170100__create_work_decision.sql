-- A signed personnel decision is the immutable source of a work-history milestone.
create table work_decision (
 id uuid primary key, legal_entity_id uuid not null, employee_id uuid not null,
 decision_number varchar(80) not null, kind varchar(20) not null,
 signed_on date not null, effective_on date not null, description varchar(1000) not null,
 previous_org_unit_id uuid, org_unit_id uuid,
 previous_position_id uuid not null, position_id uuid not null,
 actor_id uuid not null, created_at timestamptz not null,
 constraint fk_work_decision_employee foreign key(legal_entity_id, employee_id)
   references employee(legal_entity_id,id),
 constraint fk_work_decision_entity foreign key(legal_entity_id) references legal_entity(id),
 constraint uq_work_decision_number unique(legal_entity_id,decision_number),
 constraint ck_work_decision_kind check(kind in ('TRANSFER','PROMOTION','REWARD','DISCIPLINE')),
 constraint ck_work_decision_dates check(signed_on <= effective_on)
);
create index ix_work_decision_employee on work_decision(legal_entity_id,employee_id,effective_on desc);
