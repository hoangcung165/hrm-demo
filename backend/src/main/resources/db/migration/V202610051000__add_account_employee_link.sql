-- A Tài khoản (Account) belongs to 0 or 1 Nhân viên (Employee); an Employee has at most one Account.
-- The employee table arrives with HRM-06, which adds the foreign key. Until then every value is null.
alter table account add column employee_id uuid;

-- Rows without an Employee do not collide: null values are distinct in a unique index.
create unique index uq_account_employee on account (legal_entity_id, employee_id);
