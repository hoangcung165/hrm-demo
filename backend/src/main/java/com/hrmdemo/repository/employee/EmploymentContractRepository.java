package com.hrmdemo.repository.employee;

import com.hrmdemo.entity.employee.EmploymentContract;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmploymentContractRepository extends JpaRepository<EmploymentContract, UUID> {
    List<EmploymentContract> findByEmployeeIdOrderByStartsOnDesc(UUID employeeId);
    boolean existsByContractNumber(String contractNumber);

    @Query("""
       select count(c) > 0 from EmploymentContract c
       where c.employeeId = :employeeId and (:exceptId is null or c.id <> :exceptId)
       and (:endsOn is null or c.startsOn <= :endsOn)
       and (c.endsOn is null or c.endsOn >= :startsOn)
       """)
    boolean overlaps(@Param("employeeId") UUID employeeId, @Param("exceptId") UUID exceptId,
            @Param("startsOn") LocalDate startsOn, @Param("endsOn") LocalDate endsOn);
}
