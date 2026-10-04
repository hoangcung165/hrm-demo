package com.hrmdemo.repository.legalentity;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.legalentity.LegalEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * The logo is read and written with native SQL because the image bytes are not mapped on {@link LegalEntity}.
 * The write queries clear the persistence context, so load the entity again afterwards.
 */
public interface LegalEntityRepository extends JpaRepository<LegalEntity, UUID> {

    /** Locks the row until the transaction ends; a second caller waits here. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select legalEntity from LegalEntity legalEntity where legalEntity.id = :id")
    Optional<LegalEntity> findForUpdate(@Param("id") UUID id);

    @Query(value = "select logo from legal_entity where id = :id", nativeQuery = true)
    byte[] findLogo(@Param("id") UUID id);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
            update legal_entity
            set logo = :logo, logo_content_type = :contentType, logo_updated_at = :now, updated_at = :now
            where id = :id""", nativeQuery = true)
    void storeLogo(@Param("id") UUID id, @Param("logo") byte[] logo, @Param("contentType") String contentType,
            @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
            update legal_entity
            set logo = null, logo_content_type = null, logo_updated_at = null, updated_at = :now
            where id = :id""", nativeQuery = true)
    void removeLogo(@Param("id") UUID id, @Param("now") Instant now);
}
