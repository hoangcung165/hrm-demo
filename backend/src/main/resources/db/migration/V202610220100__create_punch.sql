-- Log quẹt thẻ (HRM-23): the raw punches of the fingerprint machines. One row per Employee per instant; the unique key
-- is what makes importing the same file again safe, also under concurrent imports.
create table punch_import (
    id              uuid primary key,
    legal_entity_id uuid not null,
    file_name       varchar(255),
    checksum        varchar(80) not null,
    imported_by     uuid not null,
    rows_read       integer not null,
    rows_stored     integer not null,
    rows_existing   integer not null,
    rows_refused    integer not null,
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null
);

create table punch (
    id              uuid primary key,
    legal_entity_id uuid not null,
    employee_id     uuid not null,
    punched_at      timestamp with time zone not null,
    device          varchar(100),
    import_id       uuid,
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null,
    constraint fk_punch_employee foreign key (legal_entity_id, employee_id)
        references employee (legal_entity_id, id),
    constraint fk_punch_import foreign key (import_id) references punch_import (id),
    constraint uq_punch_instant unique (employee_id, punched_at)
);

-- The attendance processor reads the punches of a date range for many Employees at once.
create index ix_punch_instant on punch (punched_at);
