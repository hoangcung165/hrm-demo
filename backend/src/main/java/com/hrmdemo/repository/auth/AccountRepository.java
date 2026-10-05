package com.hrmdemo.repository.auth;

import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.auth.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** The list filters are in {@link AccountSpecifications}. */
public interface AccountRepository extends JpaRepository<Account, UUID>, JpaSpecificationExecutor<Account> {

    Optional<Account> findByEmail(String email);
}
