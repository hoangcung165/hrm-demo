-- Thông báo trong app (HRM-12): the bell. One row per recipient (an Employee) and event. Fed by the approval
-- events and by new Ủy quyền duyệt; read_at null means unread. The request or delegation it points at may go
-- (tests empty them), and its notifications go with it.
create table notification (
    id              uuid        primary key,
    legal_entity_id uuid        not null,
    recipient_id    uuid        not null,
    -- APPROVAL_WAITING, APPROVAL_RESUBMITTED, APPROVAL_APPROVED, APPROVAL_REJECTED, APPROVAL_RETURNED,
    -- DELEGATION_RECEIVED.
    kind            varchar(40) not null,
    request_id      uuid,
    delegation_id   uuid,
    -- Who caused it; null for the system (auto-approve).
    actor_id        uuid,
    on_behalf_of_id uuid,
    -- Copied from the request so the bell needs no join: its type, summary and level.
    request_type    varchar(30),
    summary         varchar(300),
    level           integer,
    created_at      timestamp with time zone not null,
    read_at         timestamp with time zone,
    constraint fk_notification_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint fk_notification_recipient foreign key (recipient_id) references employee (id) on delete cascade,
    constraint fk_notification_request foreign key (request_id) references approval_request (id)
        on delete cascade,
    constraint fk_notification_delegation foreign key (delegation_id) references approval_delegation (id)
        on delete cascade
);

create index ix_notification_recipient on notification (recipient_id, created_at desc);
create index ix_notification_unread on notification (recipient_id) where read_at is null;
