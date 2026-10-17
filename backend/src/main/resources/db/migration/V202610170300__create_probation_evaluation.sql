-- HRM-11/BE-3: immutable evaluations of a probation contract.
create table probation_evaluation (
 id uuid primary key, legal_entity_id uuid not null, employee_id uuid not null,
 source_contract_id uuid not null, evaluator_id uuid not null,
 starts_on date not null, ends_on date not null, outcome varchar(10) not null,
 notes varchar(1000) not null, actor_id uuid not null, created_at timestamptz not null,
 constraint fk_probation_employee foreign key(legal_entity_id,employee_id)
   references employee(legal_entity_id,id),
 constraint fk_probation_evaluator foreign key(legal_entity_id,evaluator_id)
   references employee(legal_entity_id,id),
 constraint fk_probation_contract foreign key(legal_entity_id,source_contract_id)
   references employment_contract(legal_entity_id,id),
 constraint ck_probation_dates check(starts_on <= ends_on),
 constraint ck_probation_outcome check(outcome in ('PASS','FAIL','EXTEND'))
);
create index ix_probation_employee on probation_evaluation(legal_entity_id,employee_id,ends_on desc);
create index ix_probation_contract on probation_evaluation(legal_entity_id,source_contract_id,ends_on desc);
