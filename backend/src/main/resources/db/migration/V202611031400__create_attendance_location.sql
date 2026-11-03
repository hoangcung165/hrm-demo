-- Địa điểm chấm công (HRM-39): named places of the company where a mobile Lần quẹt is expected, with a radius in
-- metres. Never deleted: a place no longer used is made inactive. Changing one never changes the punches already
-- stored (a mobile punch keeps its own distance and marks).
create table attendance_location (
    id              uuid primary key,
    legal_entity_id uuid not null,
    name            varchar(100) not null,
    address         varchar(255),
    latitude        double precision not null,
    longitude       double precision not null,
    radius_meters   integer not null,
    active          boolean not null,
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null,
    constraint fk_attendance_location_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint ck_attendance_location_latitude check (latitude between -90 and 90),
    constraint ck_attendance_location_longitude check (longitude between -180 and 180),
    constraint ck_attendance_location_radius check (radius_meters between 50 and 1000)
);

-- Names are unique in the company, case ignored, inactive places included.
create unique index uq_attendance_location_name on attendance_location (legal_entity_id, lower(name));

-- The company-wide rules of mobile check-in. The defaults live in code (MobileCheckinRules.DEFAULTS); no row means
-- "as the default". One row per Legal entity.
create table mobile_checkin_setting (
    id                  uuid primary key,
    legal_entity_id     uuid not null,
    -- A mobile Lần quẹt whose reported accuracy is worse (larger) than this is marked Sai số lớn.
    max_accuracy_meters integer not null,
    updated_at          timestamp with time zone not null,
    -- The Account that saved it; kept when that Account is deleted.
    updated_by          uuid,
    constraint fk_mobile_checkin_setting_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint uq_mobile_checkin_setting unique (legal_entity_id),
    constraint ck_mobile_checkin_setting_accuracy check (max_accuracy_meters between 10 and 1000)
);
