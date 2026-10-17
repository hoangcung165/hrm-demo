-- A formal labor contract may contain a bounded probation clause.
alter table employment_contract
    add column probation_starts_on date,
    add column probation_ends_on date,
    add constraint ck_contract_probation_clause check (
        (probation_starts_on is null and probation_ends_on is null)
        or (probation_starts_on is not null and probation_ends_on is not null
            and upper(contract_type) <> 'PROBATION'
            and probation_starts_on >= starts_on
            and probation_ends_on >= probation_starts_on
            and (ends_on is null or probation_ends_on <= ends_on))
    );
