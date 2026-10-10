-- Cập nhật hồ sơ (HRM-12): an Employee's proposed changes to the contact fields of their own profile, sent as a
-- Yêu cầu phê duyệt of type PROFILE_UPDATE (same id). The profile changes only when the last level approves.
create table profile_update_request (
    id              uuid        primary key,
    legal_entity_id uuid        not null,
    employee_id     uuid        not null,
    note            varchar(500),
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null,
    constraint fk_profile_update_request_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint fk_profile_update_request_approval foreign key (id) references approval_request (id) on delete cascade,
    constraint fk_profile_update_request_employee foreign key (employee_id) references employee (id)
);

create index ix_profile_update_request_employee on profile_update_request (employee_id);

-- One changed field: its value when the request was sent (or sent again) and the proposed one; null is empty.
create table profile_update_change (
    request_id uuid        not null,
    field      varchar(40) not null,
    old_value  varchar(500),
    new_value  varchar(500),
    constraint pk_profile_update_change primary key (request_id, field),
    constraint fk_profile_update_change_request foreign key (request_id)
        references profile_update_request (id) on delete cascade
);
