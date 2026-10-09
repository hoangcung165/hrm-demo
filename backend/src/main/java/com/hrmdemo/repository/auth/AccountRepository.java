package com.hrmdemo.repository.auth;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.AccountStatus;
import com.hrmdemo.entity.auth.DemoPersona;
import com.hrmdemo.entity.auth.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** The list filters are in {@link AccountSpecifications}. */
public interface AccountRepository extends JpaRepository<Account, UUID>, JpaSpecificationExecutor<Account> {

    Optional<Account> findByEmail(String email);

    Optional<Account> findByDemoPersona(DemoPersona demoPersona);

    /** The Account linked to the Employee; at most one (unique index). */
    Optional<Account> findByEmployeeId(UUID employeeId);

    /** Every demo persona Account, whatever its status. */
    List<Account> findByDemoPersonaIsNotNull();

    /** Accounts of real people and administrators: everything but the demo personas. */
    long countByDemoPersonaIsNull();

    /** The Employees linked to an Account with this status that holds the role. */
    @Query("select distinct a.employeeId from Account a join a.roles r "
            + "where r.role = :role and a.status = :status and a.employeeId is not null")
    List<UUID> findEmployeeIdsWithRole(@Param("role") Role role, @Param("status") AccountStatus status);
}
