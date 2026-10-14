-- HRM-08/BE-3: private files live in PostgreSQL, never on the public SPA filesystem.
-- A tenant-aware composite FK prevents attaching a document to an Employee in another legal entity.
create table employee_attachment (
    id uuid primary key,
    legal_entity_id uuid not null,
    employee_id uuid not null,
    file_name varchar(180) not null,
    content_type varchar(100) not null,
    content_length integer not null,
    sha256 char(64) not null,
    uploaded_by uuid not null,
    uploaded_at timestamp with time zone not null,
    content bytea not null,
    constraint fk_employee_attachment_employee foreign key (legal_entity_id, employee_id)
        references employee (legal_entity_id, id),
    constraint ck_employee_attachment_size check (content_length > 0 and content_length <= 5242880),
    constraint ck_employee_attachment_file_name check (length(btrim(file_name)) > 0)
);
create index ix_employee_attachment_employee on employee_attachment (legal_entity_id, employee_id, uploaded_at);
