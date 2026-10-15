-- HRM-10/BE-2: immutable salary decisions, each tied to a personnel source document.
create table employee_salary_profile (
 id uuid primary key,
 legal_entity_id uuid not null,
 employee_id uuid not null,
 source_contract_id uuid not null,
 source_amendment_id uuid,
 effective_on date not null,
 ends_on date,
 base_salary numeric(18,2) not null,
 insurance_salary numeric(18,2),
 allowances_json text not null default '[]',
 insured boolean not null,
 tax_method varchar(30) not null,
 override_reason text,
 created_at timestamptz not null,
 constraint fk_salary_profile_employee foreign key (legal_entity_id,employee_id)
   references employee(legal_entity_id,id),
 constraint fk_salary_profile_contract foreign key (legal_entity_id,source_contract_id)
   references employment_contract(legal_entity_id,id),
 constraint fk_salary_profile_amendment foreign key (source_amendment_id)
   references contract_amendment(id),
 constraint ck_salary_profile_dates check (ends_on is null or ends_on >= effective_on),
 constraint ck_salary_profile_amounts check (base_salary >= 0 and (insurance_salary is null or insurance_salary >= 0)),
 constraint uq_salary_profile_contract_source unique (source_contract_id),
 constraint uq_salary_profile_amendment_source unique (source_amendment_id),
 constraint uq_salary_profile_effective unique(legal_entity_id,employee_id,effective_on)
);
create index ix_salary_profile_employee_dates on employee_salary_profile(legal_entity_id,employee_id,effective_on);

-- Preserve salary sources already entered under BE-1 before this migration ships.
insert into employee_salary_profile (id,legal_entity_id,employee_id,source_contract_id,
 effective_on,ends_on,base_salary,insurance_salary,allowances_json,insured,tax_method,created_at)
select gen_random_uuid(), legal_entity_id, employee_id, id, starts_on,ends_on,
 base_salary,insurance_salary,allowances_json,insured,tax_method,created_at
from employment_contract;

alter table contract_amendment add column base_salary numeric(18,2);
alter table contract_amendment add column insurance_salary numeric(18,2);
alter table contract_amendment add column allowances_json text;
alter table contract_amendment add column insured boolean;
alter table contract_amendment add column tax_method varchar(30);
alter table contract_amendment add column override_reason text;
