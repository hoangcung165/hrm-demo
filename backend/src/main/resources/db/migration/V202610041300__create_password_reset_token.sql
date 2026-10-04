-- One-time password reset links: the token is stored as a SHA-256 hash and expires after 30 minutes.
create table password_reset_token (
    id         uuid        primary key,
    account_id uuid        not null,
    token_hash varchar(64) not null,
    created_at timestamp with time zone not null,
    expires_at timestamp with time zone not null,
    used_at    timestamp with time zone,
    constraint fk_password_reset_token_account foreign key (account_id) references account (id) on delete cascade,
    constraint uq_password_reset_token_hash unique (token_hash)
);

create index ix_password_reset_token_account on password_reset_token (account_id);
