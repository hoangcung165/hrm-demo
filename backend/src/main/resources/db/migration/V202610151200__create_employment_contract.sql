-- HRM-10/BE-1: personnel source documents; salary profiles are owned by BE-2.
create table employment_contract (
 id uuid primary key, legal_entity_id uuid not null, employee_id uuid not null,
 contract_number varchar(80) not null, contract_type varchar(40) not null,
 signed_on date not null, starts_on date not null, ends_on date,
 base_salary numeric(18,2) not null, insurance_salary numeric(18,2),
 allowances_json text not null default '[]',
 insured boolean not null, tax_method varchar(30) not null,
 created_at timestamptz not null, updated_at timestamptz not null,
 constraint fk_contract_employee foreign key(legal_entity_id, employee_id)
   references employee(legal_entity_id,id),
 constraint fk_contract_entity foreign key(legal_entity_id) references legal_entity(id),
 constraint ck_contract_dates check(ends_on is null or ends_on >= starts_on),
 constraint ck_contract_salary check(base_salary >= 0 and (insurance_salary is null or insurance_salary >= 0)),
 constraint uq_contract_number unique(legal_entity_id,contract_number),
 constraint uq_contract_entity_id unique(legal_entity_id,id)
);
create index ix_contract_employee_dates on employment_contract(legal_entity_id,employee_id,starts_on,ends_on);
create table contract_amendment (
 id uuid primary key, legal_entity_id uuid not null, contract_id uuid not null,
 amendment_number varchar(80) not null, signed_on date not null,
 effective_on date not null, description text not null,
 created_at timestamptz not null,
 constraint fk_amendment_contract foreign key(legal_entity_id,contract_id)
    references employment_contract(legal_entity_id,id),
 constraint uq_amendment_number unique(legal_entity_id,amendment_number)
);
create index ix_amendment_contract on contract_amendment(legal_entity_id,contract_id,effective_on);
