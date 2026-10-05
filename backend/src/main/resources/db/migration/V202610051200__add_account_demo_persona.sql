-- Demo personas: Accounts seeded for the "Demo as…" switch, one per role, when hrm.demo-personas.enabled is on.
-- The key is the role name the persona stands for. Only the seeder sets this column; no API does.
alter table account add column demo_persona varchar(30);

alter table account add constraint ck_account_demo_persona check (demo_persona in
    ('ADMIN', 'HR', 'LINE_MANAGER', 'PROJECT_MANAGER', 'ACCOUNTANT', 'DIRECTOR', 'EMPLOYEE'));

-- One Account per persona. Ordinary Accounts (null) do not collide: null values are distinct in a unique index.
create unique index uq_account_demo_persona on account (legal_entity_id, demo_persona);
