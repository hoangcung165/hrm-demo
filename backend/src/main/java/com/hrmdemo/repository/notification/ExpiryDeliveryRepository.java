package com.hrmdemo.repository.notification;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.dto.employee.ExpiryType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The unique delivery key arbitrates competing scanners in PostgreSQL. Every statement names the tenant. */
@Repository
public class ExpiryDeliveryRepository {
    private final JdbcClient jdbc;

    public ExpiryDeliveryRepository(DataSource dataSource) {
        jdbc = JdbcClient.create(dataSource);
    }

    public boolean insert(UUID tenant, ExpiryType type, UUID sourceId, LocalDate expiresOn, int advanceDays,
            UUID recipientId, String path, Instant now) {
        return jdbc.sql("""
                insert into expiry_delivery (id, legal_entity_id, document_type, source_id, expires_on,
                    advance_days, recipient_id, target_path, created_at)
                values (:id, :tenant, :type, :source, :expires, :days, :recipient, :path, :now)
                on conflict (legal_entity_id, document_type, source_id, expires_on, advance_days, recipient_id)
                do nothing
                """).param("id", UUID.randomUUID()).param("tenant", tenant).param("type", type.name())
                .param("source", sourceId).param("expires", expiresOn).param("days", advanceDays)
                .param("recipient", recipientId).param("path", path).param("now", now).update() == 1;
    }

    public record Pending(UUID id, UUID recipientId, String targetPath) {}

    /** Locked until the caller's mail transaction finishes; another runner skips these rows. */
    public List<Pending> lockPending(UUID tenant, int limit) {
        return jdbc.sql("""
                select id, recipient_id, target_path from expiry_delivery
                where legal_entity_id = :tenant and mail_sent_at is null
                order by created_at, id limit :limit for update skip locked
                """).param("tenant", tenant).param("limit", limit)
                .query((rs, row) -> new Pending(rs.getObject("id", UUID.class),
                        rs.getObject("recipient_id", UUID.class), rs.getString("target_path"))).list();
    }

    public void markSent(UUID tenant, UUID id, Instant now) {
        jdbc.sql("update expiry_delivery set mail_sent_at = :now where legal_entity_id = :tenant and id = :id")
                .param("now", now).param("tenant", tenant).param("id", id).update();
    }
}
