-- HRM-11/BE-2: a pay-changing decision adds one immutable salary snapshot.
alter table work_decision add constraint uq_work_decision_entity_id unique (legal_entity_id, id);

alter table employee_salary_profile add column source_decision_id uuid;
alter table employee_salary_profile add constraint fk_salary_profile_decision
    foreign key (legal_entity_id, source_decision_id) references work_decision(legal_entity_id, id);
alter table employee_salary_profile add constraint uq_salary_profile_decision_source unique (source_decision_id);
alter table employee_salary_profile add constraint ck_salary_profile_single_change_source
    check (source_amendment_id is null or source_decision_id is null);

drop index uq_salary_profile_initial_contract;
create unique index uq_salary_profile_initial_contract on employee_salary_profile(source_contract_id)
    where source_amendment_id is null and source_decision_id is null;
