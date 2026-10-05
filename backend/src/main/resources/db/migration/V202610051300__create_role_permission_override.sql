-- Phạm vi truy cập: the permissions of each role are defaults in code; a company's changes to them are stored
-- here, as differences only. granted = true adds a permission the default does not give, granted = false takes
-- one away. No row means "as the default", so the table starts empty and a new permission in a later release
-- reaches the roles its default names. Role and permission names are not checked here on purpose: a name the
-- code no longer knows is ignored when read.
create table role_permission_override (
    id              uuid        primary key,
    legal_entity_id uuid        not null,
    role            varchar(30) not null,
    permission      varchar(50) not null,
    granted         boolean     not null,
    constraint fk_role_permission_override_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    -- Also serves the lookup by legal_entity_id alone (leading column).
    constraint uq_role_permission_override unique (legal_entity_id, role, permission)
);
