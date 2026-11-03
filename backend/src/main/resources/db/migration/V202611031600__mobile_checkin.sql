-- Mobile check-in (HRM-39). A Lần quẹt now has a source: MACHINE (Log quẹt thẻ, as before; the import's native insert
-- leaves the column to its default) or MOBILE (made from a phone browser at the server's time). A mobile punch keeps
-- the position the phone reported, the nearest Địa điểm chấm công at that moment and the distance to it, and the two
-- review marks; like every punch it is never changed or deleted.
alter table punch
    add column source            varchar(10) not null default 'MACHINE',
    add column latitude          double precision,
    add column longitude         double precision,
    add column accuracy_meters   double precision,
    add column location_id       uuid,
    add column distance_meters   integer,
    add column outside_location  boolean not null default false,
    add column low_accuracy      boolean not null default false,
    add constraint fk_punch_location foreign key (location_id) references attendance_location (id),
    add constraint ck_punch_source check (
        (source = 'MACHINE' and latitude is null and longitude is null and accuracy_meters is null
            and location_id is null and distance_meters is null and not outside_location and not low_accuracy)
        or (source = 'MOBILE' and import_id is null and device is null and latitude between -90 and 90
            and longitude between -180 and 180 and accuracy_meters >= 0
            and (location_id is null) = (distance_meters is null)));

-- The punches in the last 30 days of each place (settings list).
create index ix_punch_location on punch (location_id, punched_at) where location_id is not null;

-- The front-camera photo of a mobile Lần quẹt, kept as long as the punch (so never deleted). Apart from the punch so
-- that reading a range of punches never loads the images.
create table punch_photo (
    punch_id        uuid primary key,
    legal_entity_id uuid not null,
    content_type    varchar(30) not null,
    size_bytes      integer not null,
    sha256          varchar(64) not null,
    content         bytea not null,
    created_at      timestamp with time zone not null,
    constraint fk_punch_photo_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint fk_punch_photo_punch foreign key (punch_id) references punch (id) on delete cascade,
    constraint ck_punch_photo_type check (content_type in ('image/jpeg', 'image/png'))
);

-- The Employee's acceptance of the notice on location and photo (Decree 13/2023), asked once before the first
-- mobile check-in. Withdrawing keeps the row with its date; accepting again starts a new acceptance date.
create table mobile_checkin_consent (
    id              uuid primary key,
    legal_entity_id uuid not null,
    employee_id     uuid not null,
    notice_version  integer not null,
    accepted_at     timestamp with time zone not null,
    withdrawn_at    timestamp with time zone,
    updated_at      timestamp with time zone not null,
    constraint fk_mobile_checkin_consent_employee foreign key (legal_entity_id, employee_id)
        references employee (legal_entity_id, id),
    constraint uq_mobile_checkin_consent unique (employee_id)
);
