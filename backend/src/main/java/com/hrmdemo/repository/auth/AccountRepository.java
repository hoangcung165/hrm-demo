package com.hrmdemo.repository.auth;

import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.auth.Account;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, UUID> {

    Optional<Account> findByEmail(String email);
}
