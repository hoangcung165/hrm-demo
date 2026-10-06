-- Danh mục (Catalogs): the shared lists the company configures without code changes (HRM-05). One table for
-- the six catalogs; the typed columns belong to one catalog each, and the checks below keep them apart
-- (written with explicit "is not null": a check that evaluates to null passes).
-- See docs/contexts/org/CONTEXT.md.
create table catalog_item (
    id              uuid         primary key,
    legal_entity_id uuid         not null,
    catalog         varchar(30)  not null,
    -- Upper case; null for holidays, which have no code.
    code            varchar(20),
    name            varchar(150) not null,
    -- The name without accents in lower case (SearchText): searching and the name rule use it.
    search_text     varchar(200) not null,
    active          boolean      not null default true,
    -- Contract types: how long the contract runs, and its maximum length when it is fixed-term.
    term            varchar(20),
    max_months      integer,
    -- Allowance types: defaults that payroll reads.
    insurable       boolean,
    taxable         boolean,
    -- Holidays: the days off, both included.
    start_date      date,
    end_date        date,
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null,
    constraint fk_catalog_item_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint ck_catalog_item_catalog check (catalog in
        ('POSITION', 'CONTRACT_TYPE', 'ALLOWANCE_TYPE', 'HOLIDAY', 'SKILL', 'PROJECT_ROLE')),
    constraint ck_catalog_item_code check (
        (catalog = 'HOLIDAY' and code is null) or (catalog <> 'HOLIDAY' and code is not null and code ~ '^[A-Z0-9_-]{2,20}$')),
    constraint ck_catalog_item_term check (
        (catalog = 'CONTRACT_TYPE' and term is not null and term in ('INDEFINITE', 'FIXED', 'PROBATION')
            and ((term = 'FIXED' and max_months is not null and max_months between 1 and 36)
                or (term <> 'FIXED' and max_months is null)))
        or (catalog <> 'CONTRACT_TYPE' and term is null and max_months is null)),
    constraint ck_catalog_item_allowance check (
        (catalog = 'ALLOWANCE_TYPE' and insurable is not null and taxable is not null)
        or (catalog <> 'ALLOWANCE_TYPE' and insurable is null and taxable is null)),
    constraint ck_catalog_item_holiday check (
        (catalog = 'HOLIDAY' and start_date is not null and end_date is not null and end_date >= start_date)
        or (catalog <> 'HOLIDAY' and start_date is null and end_date is null))
);

create unique index uq_catalog_item_code on catalog_item (legal_entity_id, catalog, code) where code is not null;
create unique index uq_catalog_item_name on catalog_item (legal_entity_id, catalog, search_text);
create index ix_catalog_item_holiday on catalog_item (legal_entity_id, start_date) where catalog = 'HOLIDAY';

