-- Versioned, private HR contract DOCX templates. Each type has exactly one active version.
create table contract_template (
 id uuid primary key,
 legal_entity_id uuid not null references legal_entity(id),
 contract_type varchar(40) not null,
 version integer not null,
 file_name varchar(180) not null,
 content bytea not null,
 active boolean not null default true,
 uploaded_by uuid not null,
 uploaded_at timestamptz not null,
 constraint uq_contract_template_version unique(legal_entity_id,contract_type,version),
 constraint fk_contract_template_uploader foreign key(uploaded_by)
   references account(id)
);
create unique index uq_contract_template_active
 on contract_template(legal_entity_id,contract_type) where active;
