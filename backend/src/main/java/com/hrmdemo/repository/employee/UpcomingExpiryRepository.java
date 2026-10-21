package com.hrmdemo.repository.employee;

import com.hrmdemo.dto.employee.ExpiryType;
import com.hrmdemo.dto.employee.UpcomingExpiryItem;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** A bounded union read across Employee document types; every native source is explicitly tenant-scoped. */
@Repository
public class UpcomingExpiryRepository {
    private static final String FILTERED = """
            with sources as (
                select c.legal_entity_id, c.employee_id, c.id source_id,
                    'CONTRACT' document_type, null::text source_name, c.ends_on expires_on
                from employment_contract c where c.legal_entity_id = :tenant
                    and upper(c.contract_type) <> 'PROBATION' and c.ends_on is not null
                union all
                select c.legal_entity_id, c.employee_id, c.id, 'PROBATION', null::text,
                    case when upper(c.contract_type) = 'PROBATION' then c.ends_on else c.probation_ends_on end
                from employment_contract c where c.legal_entity_id = :tenant
                    and (upper(c.contract_type) = 'PROBATION' or c.probation_ends_on is not null)
                    and not exists (select 1 from probation_evaluation p
                        where p.legal_entity_id = c.legal_entity_id and p.source_contract_id = c.id
                        and p.outcome in ('PASS', 'FAIL'))
                union all
                select d.legal_entity_id, d.employee_id, d.id, d.document_type, null::text, d.expires_at
                from employee_expat_document d where d.legal_entity_id = :tenant
                    and d.document_type in ('VISA', 'WORK_PERMIT')
                union all
                select c.legal_entity_id, c.employee_id, c.id, 'CERTIFICATE', c.name, c.expires_at
                from employee_certificate c where c.legal_entity_id = :tenant and c.expires_at is not null
            ), eligible as (
                select s.*, e.code employee_code, e.full_name employee_name
                from sources s join employee e on e.id = s.employee_id and e.legal_entity_id = s.legal_entity_id
                join expiry_policy p on p.legal_entity_id = s.legal_entity_id and p.document_type = s.document_type
                where e.status <> 'INACTIVE' and e.legal_entity_id = :tenant
                    and (:company or (:hasUnits and e.org_unit_id in (:units)) or e.id = :self)
                    and (:type = 'ALL' or s.document_type = :type)
                    and s.expires_on between :fromDate and :toDate
                    and s.expires_on between :today and cast(:today as date) + p.advance_days
            )
            """;
    private final JdbcClient jdbc;

    public UpcomingExpiryRepository(DataSource dataSource) { jdbc = JdbcClient.create(dataSource); }

    public record Query(UUID tenant, boolean company, Set<UUID> units, UUID self, ExpiryType type,
            LocalDate today, LocalDate from, LocalDate to) {}

    public List<UpcomingExpiryItem> list(Query query, int offset, int size) {
        return statement(FILTERED + """
                select * from eligible order by expires_on, document_type, employee_id, source_id
                limit :size offset :offset
                """, query).param("size", size).param("offset", offset).query((rs, n) -> {
                    ExpiryType type = ExpiryType.valueOf(rs.getString("document_type"));
                    UUID employee = rs.getObject("employee_id", UUID.class);
                    LocalDate expires = rs.getDate("expires_on").toLocalDate();
                    return new UpcomingExpiryItem(type, rs.getObject("source_id", UUID.class), employee,
                            rs.getString("employee_code"), rs.getString("employee_name"), rs.getString("source_name"),
                            expires, (int) java.time.temporal.ChronoUnit.DAYS.between(query.today(), expires),
                            "/employees/" + employee + "?tab=" + type.profileTab());
                }).list();
    }

    public long count(Query query) {
        return statement(FILTERED + "select count(*) from eligible", query).query(Long.class).single();
    }

    /** Recheck a queued warning against the live source, current policy and recipient's current scope. */
    public boolean eligible(Query query, UUID sourceId, LocalDate expiresOn) {
        return statement(FILTERED + "select exists(select 1 from eligible where source_id = :source and expires_on = :expires)", query)
                .param("source", sourceId).param("expires", expiresOn).query(Boolean.class).single();
    }

    private JdbcClient.StatementSpec statement(String sql, Query query) {
        return jdbc.sql(sql).param("tenant", query.tenant()).param("company", query.company())
                .param("hasUnits", !query.units().isEmpty())
                .param("units", query.units().isEmpty() ? Set.of(new UUID(0, 0)) : query.units())
                .param("self", query.self(), java.sql.Types.OTHER)
                .param("type", query.type() == null ? "ALL" : query.type().name())
                .param("today", query.today()).param("fromDate", query.from()).param("toDate", query.to());
    }
}
