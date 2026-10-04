-- Tài khoản (Account): login identity with one or more roles. See docs/contexts/org/CONTEXT.md.
create table account (
    id            uuid         primary key,
    email         varchar(254) not null,
    password_hash varchar(100) not null,
    status        varchar(20)  not null,
    created_at    timestamp with time zone not null,
    constraint uq_account_email unique (email),
    constraint ck_account_status check (status in ('ACTIVE', 'LOCKED'))
);

create table account_role (
    id         uuid        primary key,
    account_id uuid        not null,
    role       varchar(30) not null,
    constraint fk_account_role_account foreign key (account_id) references account (id) on delete cascade,
    constraint uq_account_role unique (account_id, role)
);

-- Refresh tokens are stored as SHA-256 hashes. All tokens issued from one login share a family_id;
-- reusing a rotated token revokes the whole family (ADR 0001).
create table refresh_token (
    id         uuid     primary key,
    account_id uuid     not null,
    family_id  uuid     not null,
    token_hash varchar(64) not null,
    created_at timestamp with time zone not null,
    expires_at timestamp with time zone not null,
    used_at    timestamp with time zone,
    revoked_at timestamp with time zone,
    constraint fk_refresh_token_account foreign key (account_id) references account (id) on delete cascade,
    constraint uq_refresh_token_hash unique (token_hash)
);

create index ix_refresh_token_family on refresh_token (family_id);
create index ix_refresh_token_account on refresh_token (account_id);
