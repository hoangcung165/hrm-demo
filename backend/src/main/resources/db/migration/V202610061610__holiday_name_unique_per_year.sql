-- A holiday comes back every year under the same name ("Tết Dương lịch"), so a holiday name is unique within its
-- year (the year of its first day); the names of the other catalogs stay unique within their catalog.
drop index uq_catalog_item_name;
create unique index uq_catalog_item_name on catalog_item (legal_entity_id, catalog, search_text) where catalog <> 'HOLIDAY';
create unique index uq_catalog_item_holiday_name on catalog_item (legal_entity_id, search_text, (extract(year from start_date)))
    where catalog = 'HOLIDAY';
