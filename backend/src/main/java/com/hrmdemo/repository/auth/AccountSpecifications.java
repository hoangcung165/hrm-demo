package com.hrmdemo.repository.auth;

import java.util.ArrayList;
import java.util.List;

import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.AccountRole;
import com.hrmdemo.entity.auth.AccountStatus;
import com.hrmdemo.entity.auth.Role;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

/** Filters of the Account list. The Legal entity filter is added by Hibernate, as for every Account query. */
public final class AccountSpecifications {

    private AccountSpecifications() {
    }

    /**
     * Accounts that pass every given filter; a null filter is left out.
     *
     * @param searchPattern LIKE pattern over {@code search_text}, with {@code \} as the escape character
     * @param role          a role the Account holds
     */
    public static Specification<Account> matching(String searchPattern, Role role, AccountStatus status) {
        return matching(searchPattern, role, status, false);
    }

    /**
     * The Accounts that keep the company administrable: active, holding the Admin role, and not a demo
     * persona (personas disappear when the demo flag is turned off).
     */
    public static Specification<Account> activeRealAdmins() {
        return matching(null, Role.ADMIN, AccountStatus.ACTIVE, true);
    }

    private static Specification<Account> matching(String searchPattern, Role role, AccountStatus status,
            boolean withoutDemoPersonas) {
        return (root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            if (withoutDemoPersonas) {
                filters.add(cb.isNull(root.get("demoPersona")));
            }
            if (searchPattern != null) {
                filters.add(cb.like(root.<String>get("searchText"), searchPattern, '\\'));
            }
            if (status != null) {
                filters.add(cb.equal(root.get("status"), status));
            }
            if (role != null) {
                // A subquery, not a join: one row per Account, so paging and the total stay in the database.
                Subquery<Integer> held = query.subquery(Integer.class);
                Root<AccountRole> accountRole = held.from(AccountRole.class);
                held.select(cb.literal(1))
                        .where(cb.equal(accountRole.get("account"), root), cb.equal(accountRole.get("role"), role));
                filters.add(cb.exists(held));
            }
            return cb.and(filters.toArray(Predicate[]::new));
        };
    }
}
