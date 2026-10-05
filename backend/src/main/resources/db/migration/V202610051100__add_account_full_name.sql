-- A Tài khoản (Account) carries the person's full name until it is linked to an Employee (HRM-06).
-- search_text is the full name and the email in lower case without accents, written by the application
-- (com.hrmdemo.entity.SearchText); the Account list searches it and sorts by it.
alter table account add column full_name varchar(100);
alter table account add column search_text varchar(400);

-- Accounts created before this migration: the seeded Admin and other Admins get a generic name,
-- everyone else the part of the email before the @.
update account a
set full_name = case
        when exists (select 1 from account_role r where r.account_id = a.id and r.role = 'ADMIN')
            then 'Quản trị viên'
        else left(split_part(a.email, '@', 1), 100)
    end;

-- The same normalization as SearchText, in plain SQL (the demo database role cannot create the unaccent
-- extension): compose the characters, map every Vietnamese letter with a mark to its base letter (both
-- cases, because lower() leaves non-ASCII letters alone under the C locale), lower-case, collapse spaces.
update account
set search_text = btrim(regexp_replace(lower(translate(
        normalize(full_name || ' ' || email, NFC),
        'àÀáÁảẢãÃạẠăĂằẰắẮẳẲẵẴặẶâÂầẦấẤẩẨẫẪậẬèÈéÉẻẺẽẼẹẸêÊềỀếẾểỂễỄệỆìÌíÍỉỈĩĨịỊòÒóÓỏỎõÕọỌôÔồỒốỐổỔỗỖộỘơƠờỜớỚởỞỡỠợỢùÙúÚủỦũŨụỤưƯừỪứỨửỬữỮựỰỳỲýÝỷỶỹỸỵỴđĐ',
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaeeeeeeeeeeeeeeeeeeeeeeiiiiiiiiiioooooooooooooooooooooooooooooooooouuuuuuuuuuuuuuuuuuuuuuyyyyyyyyyydd')), '\s+', ' ', 'g'));

alter table account alter column full_name set not null;
alter table account alter column search_text set not null;
