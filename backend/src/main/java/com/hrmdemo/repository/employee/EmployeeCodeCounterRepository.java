package com.hrmdemo.repository.employee;

import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.employee.EmployeeCodeCounter;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** The employee code counter row of a Legal entity; the caller passes the Legal entity's id. */
public interface EmployeeCodeCounterRepository extends JpaRepository<EmployeeCodeCounter, UUID> {

    /** The row, locked until the transaction ends ({@code select ... for update}). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from EmployeeCodeCounter c where c.legalEntityId = :legalEntityId")
    Optional<EmployeeCodeCounter> findForUpdate(@Param("legalEntityId") UUID legalEntityId);

    /** Creates the row at 0 unless it exists; safe when two transactions do it at once. */
    @Modifying
    @Query(value = """
            insert into employee_code_counter (legal_entity_id, last_value) values (:legalEntityId, 0)
            on conflict (legal_entity_id) do nothing""", nativeQuery = true)
    int insertIfMissing(@Param("legalEntityId") UUID legalEntityId);
}
