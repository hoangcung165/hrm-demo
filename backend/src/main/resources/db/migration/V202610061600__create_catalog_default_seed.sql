-- Which sets of catalog defaults (HRM-05) a company has received. A set is seeded once: a default the company
-- deleted or renamed does not come back at the next start, and a later release adds a new set (the holidays of
-- the next year) under a new key. See CatalogDefaults.
create table catalog_default_seed (
    id              uuid        primary key,
    legal_entity_id uuid        not null,
    -- e.g. 'positions' or 'holidays-2026'.
    seed_set        varchar(40) not null,
    seeded_at       timestamp with time zone not null,
    constraint fk_catalog_default_seed_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint uq_catalog_default_seed unique (legal_entity_id, seed_set)
);
