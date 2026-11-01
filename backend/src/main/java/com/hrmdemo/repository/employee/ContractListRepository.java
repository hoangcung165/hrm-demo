package com.hrmdemo.repository.employee;

import com.hrmdemo.dto.employee.ContractState;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Contract terms joined to their Employee, tenant-scoped and limited to the caller's Employee scope. */
@Repository
public class ContractListRepository {
    private static final String FROM = """
            from employment_contract c
            join employee e on e.id = c.employee_id and e.legal_entity_id = c.legal_entity_id
            where c.legal_entity_id = :tenant
                and (:company or (:hasUnits and e.org_unit_id in (:units)) or e.id = :self)
                and (:type = '' or upper(c.contract_type) = :type)
                and (not :hasSearch or e.search_text like :pattern escape '\\'
                    or lower(c.contract_number) like :pattern escape '\\')
                and (:state = 'ALL'
                    or (:state = 'UPCOMING' and c.starts_on > :today)
                    or (:state = 'ENDED' and c.starts_on <= :today and c.ends_on < :today)
                    or (:state = 'EXPIRING' and c.starts_on <= :today and c.ends_on between :today and :soon)
                    or (:state = 'CURRENT' and c.starts_on <= :today and (c.ends_on is null or c.ends_on > :soon)))
            """;
    /** Running and future terms by end date, open-ended after them; ended terms last, most recent first. */
    private static final String ORDER = """
            order by case when c.ends_on < :today then 2 when c.ends_on is null then 1 else 0 end,
                case when c.ends_on >= :today then c.ends_on end, c.ends_on desc,
                e.search_text, c.id
            """;
    private final JdbcClient jdbc;

    public ContractListRepository(DataSource dataSource) { jdbc = JdbcClient.create(dataSource); }

    /** {@code type} is upper case or empty; {@code pattern} is a LIKE pattern or null; {@code state} is a name or ALL. */
    public record Query(UUID tenant, boolean company, Set<UUID> units, UUID self, String type, String pattern,
            String state, LocalDate today) {}

    public record Row(UUID id, UUID employeeId, String employeeCode, String employeeName, String contractNumber,
            String contractType, LocalDate startsOn, LocalDate endsOn) {}

    public List<Row> list(Query query, int offset, int size) {
        return statement("""
                select c.id, c.employee_id, e.code employee_code, e.full_name employee_name, c.contract_number,
                    c.contract_type, c.starts_on, c.ends_on
                """ + FROM + ORDER + " limit :size offset :offset", query)
                .param("size", size).param("offset", offset)
                .query((rs, n) -> new Row(rs.getObject("id", UUID.class), rs.getObject("employee_id", UUID.class),
                        rs.getString("employee_code"), rs.getString("employee_name"), rs.getString("contract_number"),
                        rs.getString("contract_type"), rs.getDate("starts_on").toLocalDate(),
                        rs.getDate("ends_on") == null ? null : rs.getDate("ends_on").toLocalDate()))
                .list();
    }

    public long count(Query query) {
        return statement("select count(*) " + FROM, query).query(Long.class).single();
    }

    private JdbcClient.StatementSpec statement(String sql, Query query) {
        return jdbc.sql(sql).param("tenant", query.tenant()).param("company", query.company())
                .param("hasUnits", !query.units().isEmpty())
                .param("units", query.units().isEmpty() ? Set.of(new UUID(0, 0)) : query.units())
                .param("self", query.self(), java.sql.Types.OTHER)
                .param("type", query.type()).param("hasSearch", query.pattern() != null)
                .param("pattern", query.pattern() == null ? "%" : query.pattern())
                .param("state", query.state()).param("today", query.today())
                .param("soon", query.today().plusDays(ContractState.EXPIRING_DAYS));
    }
}
