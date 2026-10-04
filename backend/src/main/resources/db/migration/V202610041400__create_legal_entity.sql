-- Pháp nhân (Legal entity): the company that owns all business data. See docs/contexts/org/CONTEXT.md.
-- The demo has exactly one (ADR 0003); it is created here, at installation, and no API creates another.
create table legal_entity (
    id                         uuid         primary key,
    name                       varchar(200) not null,
    tax_code                   varchar(14),
    address                    varchar(500),
    legal_representative_name  varchar(100),
    legal_representative_title varchar(100),
    logo                       bytea,
    logo_content_type          varchar(50),
    logo_updated_at            timestamp with time zone,
    created_at                 timestamp with time zone not null,
    updated_at                 timestamp with time zone not null,
    constraint ck_legal_entity_logo check ((logo is null) = (logo_content_type is null))
);

-- Exactly one Legal entity: every row has the same index key, so a second insert fails.
-- Multi-company (ADR 0003, Planning) starts by dropping this index.
create unique index uq_legal_entity_single on legal_entity ((true));

insert into legal_entity (id, name, created_at, updated_at)
values (gen_random_uuid(), 'Company', now(), now());

-- Root tables carry legal_entity_id (ADR 0003). Account is the first one; Accounts created before this
-- migration (e.g. the seeded Admin) move to the default Legal entity.
-- Token tables hang off account and do not repeat the column.
alter table account add column legal_entity_id uuid;
update account set legal_entity_id = (select id from legal_entity);
alter table account alter column legal_entity_id set not null;
alter table account add constraint fk_account_legal_entity foreign key (legal_entity_id) references legal_entity (id);
create index ix_account_legal_entity on account (legal_entity_id);
