package com.hrmdemo.repository.auth;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.DemoPersona;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** The list filters are in {@link AccountSpecifications}. */
public interface AccountRepository extends JpaRepository<Account, UUID>, JpaSpecificationExecutor<Account> {

    Optional<Account> findByEmail(String email);

    Optional<Account> findByDemoPersona(DemoPersona demoPersona);

    /** Every demo persona Account, whatever its status. */
    List<Account> findByDemoPersonaIsNotNull();

    /** Accounts of real people and administrators: everything but the demo personas. */
    long countByDemoPersonaIsNull();
}
