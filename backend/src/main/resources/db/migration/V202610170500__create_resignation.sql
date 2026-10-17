-- Immutable resignation document for one Employee.
create table resignation (
 id uuid primary key, legal_entity_id uuid not null, employee_id uuid not null,
 last_working_day date not null, reason varchar(1000) not null,
 actor_id uuid not null, created_at timestamptz not null,
 constraint fk_resignation_employee foreign key(legal_entity_id,employee_id)
   references employee(legal_entity_id,id),
 constraint uq_resignation_employee unique(legal_entity_id,employee_id)
);
