-- Ngưỡng nguồn lực (HRM-17): the company's thresholds for the heatmap, Bench and Sắp hết dự án. The defaults live in
-- code (ResourceThresholds.DEFAULTS); no row means "as the default", so the table starts empty and saving the defaults
-- removes the row. One row per Legal entity.
create table resource_setting (
    id                uuid    primary key,
    legal_entity_id   uuid    not null,
    -- Tải phân bổ below this percent is Bench.
    bench_percent     integer not null,
    -- From this percent up to 100 the heatmap cell is drawn dark.
    near_full_percent integer not null,
    -- An allocation ending within this many weeks is Sắp hết dự án.
    ending_weeks      integer not null,
    updated_at        timestamp with time zone not null,
    -- The Account that saved it; kept when that Account is deleted.
    updated_by        uuid,
    constraint fk_resource_setting_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint uq_resource_setting unique (legal_entity_id),
    constraint ck_resource_setting_percent check (bench_percent between 1 and 99
        and near_full_percent between 2 and 100 and bench_percent < near_full_percent),
    constraint ck_resource_setting_weeks check (ending_weeks between 1 and 12)
);
