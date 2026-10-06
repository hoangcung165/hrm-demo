-- The last Mã nhân viên issued per Legal entity (NV + at least 5 digits). The create transaction locks the row
-- (select ... for update), so concurrent creates queue and never get the same code; a rolled-back create rolls
-- the counter back too.
create table employee_code_counter (
    legal_entity_id uuid    primary key,
    last_value      integer not null default 0,
    constraint fk_employee_code_counter_legal_entity foreign key (legal_entity_id) references legal_entity (id),
    constraint ck_employee_code_counter_last_value check (last_value >= 0)
);

insert into employee_code_counter (legal_entity_id, last_value)
select id, 0 from legal_entity;
